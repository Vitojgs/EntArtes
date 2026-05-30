import prisma from "../config/db.js";
import { createNotificacao } from "./notificacoes.service.js";
import { createAuditLog } from "./audit.service.js";
import {
  duracaoParaMinutos,
  encontrarDisponibilidadeCompativel,
  recalcularMinutosOcupados,
  recalcularMinutosOcupadosMuitos,
} from "../utils/disponibilidadeOcupacao.js";
import { buildNotification } from "../utils/notificationTemplates.js";

export async function listarAulas() {
  return prisma.aula.findMany({
    include: {
      estadoaula: true,
      sala: true,
      pedidodeaula: {
        include: {
          disponibilidade_mensal: true,
          grupo: true,
        },
      },
      alunoaula: {
        include: {
          aluno: {
            include: {
              utilizador: true,
            },
          },
        },
      },
    },
  });
}

export async function consultarAula(id) {
  return prisma.aula.findUnique({
    where: { idaula: parseInt(id) },
    include: {
      estadoaula: true,
      sala: true,
      pedidodeaula: {
        include: {
          disponibilidade_mensal: true,
          grupo: true,
        },
      },
      alunoaula: {
        include: {
          aluno: {
            include: {
              utilizador: true,
            },
          },
        },
      },
    },
  });
}

export async function obterAulaDoPedido(pedidoId) {
  return prisma.aula.findFirst({
    where: { pedidodeaulaidpedidoaula: parseInt(pedidoId) },
    include: {
      estadoaula: true,
      sala: true,
      pedidodeaula: {
        include: {
          disponibilidade_mensal: true,
          grupo: true,
          estado: true,
        },
      },
      alunoaula: {
        include: {
          aluno: {
            include: {
              utilizador: true,
            },
          },
        },
      },
    },
  });
}

export async function criarAula(data) {
  const { pedidodeaulaidpedidoaula, salaidsala } = data;

  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: pedidodeaulaidpedidoaula },
    include: {
      disponibilidade_mensal: true,
      sala: true,
    },
  });

  if (!pedido) {
    throw new Error("Pedido de aula não encontrado");
  }

  const conflictingAulas = await prisma.aula.findMany({
    where: {
      salaidsala: salaidsala,
      pedidodeaula: {
        data: pedido.data,
      },
    },
    include: {
      pedidodeaula: true,
    },
  });

  for (const aula of conflictingAulas) {
    if (aula.pedidodeaula && pedido.horainicio) {
      const existingStart = new Date(aula.pedidodeaula.horainicio).getTime();
      const existingEnd = existingStart + (aula.pedidodeaula.duracaoaula?.getTime() || 0);
      const newStart = new Date(pedido.horainicio).getTime();
      const newEnd = newStart + (pedido.duracaoaula?.getTime() || 0);

      if (newStart < existingEnd && newEnd > existingStart) {
        throw new Error("Sala não disponível para o horário solicitado");
      }
    }
  }

  const estadoPendente = await prisma.estadoaula.findFirst({
    where: { nomeestadoaula: "PENDENTE" },
  });

  if (!estadoPendente) {
    throw new Error("Estado PENDENTE não encontrado");
  }

  return prisma.aula.create({
    data: {
      pedidodeaulaidpedidoaula,
      salaidsala,
      estadoaulaidestadoaula: estadoPendente.idestadoaula,
    },
    include: {
      estadoaula: true,
      sala: true,
      pedidodeaula: true,
    },
  });
}

export async function updateAula(id, data) {
  const { salaidsala, estadoaulaidestadoaula } = data;

  const existingAula = await prisma.aula.findUnique({
    where: { idaula: parseInt(id) },
    include: {
      pedidodeaula: true,
    },
  });

  if (!existingAula) {
    throw new Error("Aula não encontrada");
  }

  if (salaidsala && salaidsala !== existingAula.salaidsala) {
    const pedido = await prisma.pedidodeaula.findUnique({
      where: { idpedidoaula: existingAula.pedidodeaulaidpedidoaula },
    });

    if (pedido) {
      const conflictingAulas = await prisma.aula.findMany({
        where: {
          salaidsala: salaidsala,
          idaula: { not: parseInt(id) },
          pedidodeaula: {
            data: pedido.data,
          },
        },
      });

      for (const aula of conflictingAulas) {
        if (aula.pedidodeaula && pedido.horainicio) {
          const existingStart = new Date(aula.pedidodeaula.horainicio).getTime();
          const existingEnd = existingStart + (aula.pedidodeaula.duracaoaula?.getTime() || 0);
          const newStart = new Date(pedido.horainicio).getTime();
          const newEnd = newStart + (pedido.duracaoaula?.getTime() || 0);

          if (newStart < existingEnd && newEnd > existingStart) {
            throw new Error("Sala não disponível para o horário solicitado");
          }
        }
      }
    }
  }

  return prisma.aula.update({
    where: { idaula: parseInt(id) },
    data: {
      ...(salaidsala && { salaidsala }),
      ...(estadoaulaidestadoaula && { estadoaulaidestadoaula }),
    },
    include: {
      estadoaula: true,
      sala: true,
      pedidodeaula: true,
      alunoaula: true,
    },
  });
}

export async function deleteAula(id) {
  const existingAula = await prisma.aula.findUnique({
    where: { idaula: parseInt(id) },
  });

  if (!existingAula) {
    throw new Error("Aula não encontrada");
  }

  await prisma.alunoaula.deleteMany({
    where: { aulaidaula: parseInt(id) },
  });

  return prisma.aula.delete({
    where: { idaula: parseInt(id) },
  });
}

export async function confirmAula(id) {
  const aula = await prisma.aula.findUnique({
    where: { idaula: parseInt(id) },
  });

  if (!aula) {
    throw new Error("Aula não encontrada");
  }

  const estadoConfirmada = await prisma.estadoaula.findFirst({
    where: { nomeestadoaula: "CONFIRMADO" },
  });

  if (!estadoConfirmada) {
    throw new Error("Estado CONFIRMADO não encontrado");
  }

  return prisma.aula.update({
    where: { idaula: parseInt(id) },
    data: {
      estadoaulaidestadoaula: estadoConfirmada.idestadoaula,
    },
    include: {
      estadoaula: true,
      sala: true,
      pedidodeaula: true,
    },
  });
}

export async function cancelarAula(id) {
  const estadoCancelado = await prisma.estado.findFirst({
    where: { tipoestado: { equals: 'Cancelado', mode: 'insensitive' } },
  });
  if (!estadoCancelado) throw new Error('Estado Cancelado não encontrado');

  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(id) },
    include: {
      estado: true,
      encarregadoeducacao: { include: { utilizador: true } },
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } },
      },
    },
  });
  if (!pedido) throw new Error('Aula não encontrada');

  if (pedido.estado && pedido.estado.tipoestado.toLowerCase() === 'cancelado') {
    throw new Error('A aula já foi cancelada anteriormente');
  }

  await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(id) },
    data: { estadoidestado: estadoCancelado.idestado },
  });

  const estadoAulaCancelada = await prisma.estadoaula.findFirst({
    where: { nomeestadoaula: { equals: 'CANCELADO', mode: 'insensitive' } },
  });
  if (estadoAulaCancelada) {
    await prisma.aula.updateMany({
      where: { pedidodeaulaidpedidoaula: parseInt(id) },
      data: { estadoaulaidestadoaula: estadoAulaCancelada.idestadoaula },
    });
  }

  await recalcularMinutosOcupados(prisma, pedido.disponibilidade_mensal_id);

  const professorNome =
    pedido.disponibilidade_mensal?.professor?.utilizador?.nome
      ? `(prof. ${pedido.disponibilidade_mensal.professor.utilizador.nome})`
      : '';

  const direcao = await prisma.direcao.findFirst();
  if (direcao) {
    const notificacao = buildNotification('aulaCancelada', { origem: `professor ${professorNome}`.trim() });
    await createNotificacao(
      direcao.utilizadoriduser,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(id), notificacao.referencia_tipo
    );
  }

  if (pedido.encarregadoeducacao) {
    const notificacao = buildNotification('aulaCancelada', { origem: 'professor' });
    await createNotificacao(
      pedido.encarregadoeducacao.utilizadoriduser,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(id), notificacao.referencia_tipo
    );
  }

  return { success: true };
}

export async function remarcarAula(id, newData, newHora, salaId) {
  const agora = new Date();
  const novaDataInput = new Date(newData);
  const dataHojeStr = agora.toISOString().split('T')[0];
  const novaDataStr = novaDataInput.toISOString().split('T')[0];
  
  if (novaDataStr < dataHojeStr) {
    throw new Error('A data não pode ser no passado');
  }
  
  if (novaDataStr === dataHojeStr && newHora) {
    const [horaH, horaM] = newHora.split(':').map(Number);
    const horaInput = horaH * 60 + horaM;
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    if (horaInput <= horaAtual) {
      throw new Error('A hora deve ser posterior à hora atual');
    }
  }
  
  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(id) },
    include: {
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } },
      },
      encarregadoeducacao: { include: { utilizador: true } },
      sala: true,
    },
  });

  if (!pedido) throw new Error("Aula não encontrada");

  const professorUserId = pedido.disponibilidade_mensal?.professor?.utilizadoriduser;

  const salaidsalaFinal = salaId ? Number(salaId) : pedido.salaidsala;

  // Server-side conflict check: same professor or same sala at same date/hora
  if (professorUserId && newData && newHora) {
    const conflitos = await prisma.$queryRaw`
      SELECT pa.idpedidoaula FROM pedidodeaula pa
      JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
      JOIN estado e ON pa.estadoidestado = e.idestado
      WHERE dm.professorutilizadoriduser = ${professorUserId}
      AND pa.data::date = ${newData}::date
      AND pa.horainicio::time = ${newHora}::time
      AND LOWER(e.tipoestado) IN ('pendente', 'confirmado', 'aprovado')
      AND pa.idpedidoaula != ${parseInt(id)}
    `;
    if (conflitos.length > 0) {
      throw new Error('O professor já tem uma aula marcada nesse horário');
    }

    const conflitosSala = await prisma.$queryRaw`
      SELECT pa.idpedidoaula FROM pedidodeaula pa
      JOIN estado e ON pa.estadoidestado = e.idestado
      WHERE pa.salaidsala = ${salaidsalaFinal}
      AND pa.data::date = ${newData}::date
      AND pa.horainicio::time = ${newHora}::time
      AND LOWER(e.tipoestado) IN ('pendente', 'confirmado', 'aprovado')
      AND pa.idpedidoaula != ${parseInt(id)}
    `;
    if (conflitosSala.length > 0) {
      throw new Error('A sala já está ocupada nesse horário');
    }
  }

  const tresHoras = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const updateData = {
    novadata: newData ? new Date(newData) : undefined,
    novaDataLimite: tresHoras,
    sugestaoestado: 'AGUARDA_PROFESSOR',
  };
  if (salaId && Number(salaId) !== pedido.salaidsala) {
    updateData.salaidsala = Number(salaId);
  }

  const updated = await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(id) },
    data: updateData,
  });

  if (salaId && Number(salaId) !== pedido.salaidsala) {
    await prisma.aula.updateMany({
      where: { pedidodeaulaidpedidoaula: parseInt(id) },
      data: { salaidsala: Number(salaId) },
    });
  }

  if (professorUserId) {
    const dataFormatada = newData ? new Date(newData).toLocaleDateString('pt-PT') : '';
    const extraInfo = salaId ? ` na sala ${salaidsalaFinal}` : '';
    const notificacao = buildNotification('sugestaoProfessor', { id, data: dataFormatada });
    await createNotificacao(
      professorUserId,
      notificacao.mensagem + extraInfo,
      notificacao.tipo,
      parseInt(id), notificacao.referencia_tipo
    );
  }

  await createAuditLog(null, 'Direção', 'UPDATE', 'PedidoAula', parseInt(id), `Direção propôs remarcação para ${newData}${salaId ? `, sala ${salaId}` : ''}`);

  return updated;
}

export async function responderSugestaoProfessor(aulaId, aceitar, professorUserId) {
  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(aulaId) },
    include: {
      encarregadoeducacao: { include: { utilizador: true } },
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } },
      },
    },
  });

  if (!pedido) throw new Error("Aula não encontrada");
  if (pedido.sugestaoestado !== 'AGUARDA_PROFESSOR') {
    throw new Error("Não existe sugestão pendente para este professor");
  }

  const professorDaAula = pedido.disponibilidade_mensal?.professor?.utilizadoriduser;
  if (professorDaAula && professorDaAula !== parseInt(professorUserId)) {
    throw new Error("Não tem permissão para responder a esta sugestão");
  }

  if (!aceitar) {
    // Professor rejects: reset suggestion, keep aula state — Direção can propose again
    await prisma.pedidodeaula.update({
      where: { idpedidoaula: parseInt(aulaId) },
      data: { novadata: null, novaDataLimite: null, sugestaoestado: null },
    });

    const direcao = await prisma.direcao.findFirst();
    if (direcao) {
      const notificacao = buildNotification('remarcacaoRejeitadaProfessor', { id: aulaId });
      await createNotificacao(
        direcao.utilizadoriduser,
        notificacao.mensagem,
        notificacao.tipo,
        parseInt(aulaId), notificacao.referencia_tipo
      );
    }
    return { rejeitada: true };
  }

  // Professor accepts: forward to EE for confirmation
  const encarregadoUserId = pedido.encarregadoeducacao?.utilizadoriduser;
  const dataFormatadaEE = pedido.novadata
    ? new Date(pedido.novadata).toLocaleDateString('pt-PT')
    : '';

  const tresHoras = new Date(Date.now() + 3 * 60 * 60 * 1000);
  await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(aulaId) },
    data: { novaDataLimite: tresHoras, sugestaoestado: 'AGUARDA_EE' },
  });

  await createAuditLog(
    parseInt(professorUserId), '', 'UPDATE', 'PedidoAula', parseInt(aulaId),
    `Professor aceitou remarcação, aguarda confirmação do EE`
  );

  if (encarregadoUserId) {
    const notificacao = buildNotification('sugestaoEncarregado', { id: aulaId, data: dataFormatadaEE, origem: 'O professor' });
    await createNotificacao(
      encarregadoUserId,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(aulaId), notificacao.referencia_tipo
    );
  }

  return { reencaminhada: true, sugestaoestado: 'AGUARDA_EE' };
}

export async function responderSugestaoEE(aulaId, aceitar, encarregadoUserId) {
  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(aulaId) },
    include: {
      encarregadoeducacao: { include: { utilizador: true } },
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } },
      },
    },
  });

  if (!pedido) throw new Error("Aula não encontrada");
  if (pedido.sugestaoestado !== 'AGUARDA_EE') {
    throw new Error("Não existe sugestão pendente para este encarregado");
  }

  const encarregadoDaAula = pedido.encarregadoeducacao?.utilizadoriduser;
  if (encarregadoDaAula && encarregadoDaAula !== parseInt(encarregadoUserId)) {
    throw new Error("Não tem permissão para responder a esta sugestão");
  }

  const novaData = pedido.novadata;
  const professorId = pedido.disponibilidade_mensal?.professor?.utilizadoriduser;
  const direcao = await prisma.direcao.findFirst();
  const dataFormatada = novaData ? new Date(novaData).toLocaleDateString('pt-PT') : '';

  if (!aceitar) {
    await createAuditLog(
      parseInt(encarregadoUserId), '', 'UPDATE', 'PedidoAula', parseInt(aulaId),
      `EE rejeitou remarcação`
    );
    const estadoCancelado = await prisma.estado.findFirst({
      where: { tipoestado: { equals: 'Cancelado', mode: 'insensitive' } },
    });
    await prisma.pedidodeaula.update({
      where: { idpedidoaula: parseInt(aulaId) },
      data: {
        novadata: null,
        novaDataLimite: null,
        sugestaoestado: null,
        ...(estadoCancelado && { estadoidestado: estadoCancelado.idestado }),
      },
    });
    await recalcularMinutosOcupados(prisma, pedido.disponibilidade_mensal_id);

    if (professorId) {
      const notificacao = buildNotification('aulaCancelada', { origem: 'encarregado' });
      await createNotificacao(
        professorId,
        notificacao.mensagem,
        notificacao.tipo,
        parseInt(aulaId), notificacao.referencia_tipo
      );
    }
    if (direcao) {
      const notificacao = buildNotification('aulaCancelada', { origem: 'encarregado' });
      await createNotificacao(
        direcao.utilizadoriduser,
        notificacao.mensagem,
        notificacao.tipo,
        parseInt(aulaId), notificacao.referencia_tipo
      );
    }

    return { cancelada: true };
  }

  const oldDisponibilidadeId = pedido.disponibilidade_mensal_id;
  const duracaoMinutos = duracaoParaMinutos(pedido.duracaoaula);
  const modalidadeProfessorId = pedido.disponibilidade_mensal?.modalidadesprofessoridmodalidadeprofessor;
  const novaDisponibilidadeId = await encontrarDisponibilidadeCompativel(prisma, {
    professorUserId: professorId,
    data: novaData,
    horainicio: pedido.horainicio,
    duracaoMinutos,
    modalidadeProfessorId,
  });

  const updated = await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(aulaId) },
    data: {
      data: novaData,
      disponibilidade_mensal_id: novaDisponibilidadeId || oldDisponibilidadeId,
      novadata: null,
      novaDataLimite: null,
      sugestaoestado: null,
    },
  });

  await createAuditLog(
    parseInt(encarregadoUserId), '', 'UPDATE', 'PedidoAula', parseInt(aulaId),
    `EE aceitou remarcação para ${dataFormatada}`
  );

  await recalcularMinutosOcupadosMuitos(prisma, [oldDisponibilidadeId, novaDisponibilidadeId]);

  if (professorId) {
    const notificacao = buildNotification('aulaRemarcada', { id: aulaId, data: dataFormatada });
    await createNotificacao(
      professorId,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(aulaId), notificacao.referencia_tipo
    );
  }
  if (direcao) {
    const notificacao = buildNotification('aulaRemarcada', { id: aulaId, data: dataFormatada });
    await createNotificacao(
      direcao.utilizadoriduser,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(aulaId), notificacao.referencia_tipo
    );
  }

  return updated;
}

export async function inserirAlunoAula(aulaId, alunoId) {
  const aula = await prisma.aula.findUnique({
    where: { idaula: parseInt(aulaId) },
    include: {
      pedidodeaula: true,
      alunoaula: true,
      estadoaula: true,
    },
  });

  if (!aula) {
    throw new Error("Aula não encontrada");
  }

    if (aula.estadoaula.nomeestadoaula !== "PENDENTE" && aula.estadoaula.nomeestadoaula !== "CONFIRMADO") {
    throw new Error("Não é possível juntar-se a esta aula");
  }

  const alreadyJoined = aula.alunoaula.some((a) => a.alunoidaluno === parseInt(alunoId));
  if (alreadyJoined) {
    throw new Error("Aluno já participa nesta aula");
  }

  if (aula.pedidodeaula && aula.alunoaula.length >= aula.pedidodeaula.maxparticipantes) {
    throw new Error("Atingido limite máximo de participantes");
  }

  const aluno = await prisma.aluno.findUnique({
    where: { idaluno: parseInt(alunoId) },
  });

  if (!aluno) {
    throw new Error("Aluno não encontrado");
  }

  return prisma.alunoaula.create({
    data: {
      alunoidaluno: parseInt(alunoId),
      aulaidaula: parseInt(aulaId),
    },
    include: {
      aluno: true,
      aula: {
        include: {
          estadoaula: true,
          sala: true,
        },
      },
    },
  });
}

export async function getEstadoAulaByName(nome) {
  return prisma.estadoaula.findFirst({
    where: { nomeestadoaula: nome },
  });
}

export async function pedirRemarcacao(pedidoId, professorUserId) {
  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(pedidoId) },
    include: {
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } },
      },
    },
  });
  if (!pedido) throw new Error('Aula não encontrada');

  const professorDaAula = pedido.disponibilidade_mensal?.professor?.utilizadoriduser;
  if (professorDaAula && professorDaAula !== parseInt(professorUserId)) {
    throw new Error('Não tem permissão para pedir remarcação desta aula');
  }

  const tresHoras = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const updated = await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(pedidoId) },
    data: { novadata: null, novaDataLimite: tresHoras, sugestaoestado: 'AGUARDA_DIRECAO' },
  });

  const direcao = await prisma.direcao.findFirst();
  if (direcao) {
    const professorNome = pedido.disponibilidade_mensal?.professor?.utilizador?.nome || 'Professor';
    const notificacao = buildNotification('sugestaoDirecao', { id: pedidoId, professorNome });
    await createNotificacao(
      direcao.utilizadoriduser,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(pedidoId), notificacao.referencia_tipo
    );
  }
  return updated;
}

export async function sugerirNovaData(pedidoId, novaData, novaHora) {
  const agora = new Date();
  const novaDataInput = new Date(novaData);
  const dataHojeStr = agora.toISOString().split('T')[0];
  const novaDataStr = novaDataInput.toISOString().split('T')[0];

  if (novaHora) {
    const [h, m] = novaHora.split(':').map(Number);
    novaDataInput.setHours(h, m, 0, 0);
  }

  if (novaDataStr < dataHojeStr) {
    throw new Error('A data não pode ser no passado');
  }

  if (novaDataStr === dataHojeStr) {
    const horaInput = novaDataInput.getHours() * 60 + novaDataInput.getMinutes();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    if (horaInput <= horaAtual) {
      throw new Error('A hora deve ser posterior à hora atual');
    }
  }

  const updateData = {
    novadata: new Date(novaData),
    sugestaoestado: 'AGUARDA_DIRECAO',
  };

  if (novaHora) {
    const [h, m] = novaHora.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(h, m, 0, 0);
    updateData.horainicio = timeDate;
  }

  const pedido = await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(pedidoId) },
    data: updateData,
    include: {
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } },
      },
      encarregadoeducacao: { include: { utilizador: true } },
      sala: true,
    },
  });

  const direcao = await prisma.direcao.findFirst();
  if (direcao) {
    const dataFormatada = new Date(novaData).toLocaleDateString('pt-PT');
    const professorNome = pedido.disponibilidade_mensal?.professor?.utilizador?.nome || `professor #${pedido.disponibilidade_mensal?.professor?.utilizadoriduser}`;
    const notificacao = buildNotification('sugestaoDirecao', { id: pedidoId, professorNome, data: dataFormatada, hora: novaHora });
    await createNotificacao(
      direcao.utilizadoriduser,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(pedidoId), notificacao.referencia_tipo
    );
  }

  await createAuditLog(null, 'Professor', 'UPDATE', 'PedidoAula', parseInt(pedidoId), `Professor sugeriu nova data ${novaData}${novaHora ? ' ' + novaHora : ''}`);

  return pedido;
}

export async function sugerirNovaDataDirecao(pedidoId, novaData, novaHora) {
  const agora = new Date();
  const novaDataInput = new Date(novaData);
  const dataHojeStr = agora.toISOString().split('T')[0];
  const novaDataStr = novaDataInput.toISOString().split('T')[0];

  if (novaHora) {
    const [h, m] = novaHora.split(':').map(Number);
    novaDataInput.setHours(h, m, 0, 0);
  }

  if (novaDataStr < dataHojeStr) {
    throw new Error('A data não pode ser no passado');
  }

  if (novaDataStr === dataHojeStr) {
    const horaInput = novaDataInput.getHours() * 60 + novaDataInput.getMinutes();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    if (horaInput <= horaAtual) {
      throw new Error('A hora deve ser posterior à hora atual');
    }
  }

  const updateData = {
    novadata: new Date(novaData),
    sugestaoestado: 'AGUARDA_EE',
  };

  if (novaHora) {
    const [h, m] = novaHora.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(h, m, 0, 0);
    updateData.horainicio = timeDate;
  }

  const pedido = await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(pedidoId) },
    data: updateData,
    include: {
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } },
      },
      encarregadoeducacao: { include: { utilizador: true } },
      sala: true,
    },
  });

  const dataFormatada = new Date(novaData).toLocaleDateString('pt-PT');

  // Notify EE to confirm the new date
  if (pedido.encarregadoeducacao?.utilizador) {
    const notificacao = buildNotification('sugestaoEncarregado', { id: pedidoId, data: dataFormatada, hora: novaHora, origem: 'A Direção' });
    await createNotificacao(
      pedido.encarregadoeducacao.utilizador.iduser,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(pedidoId), notificacao.referencia_tipo
    );
  }

  // Notify professor for awareness
  if (pedido.disponibilidade_mensal?.professor?.utilizador) {
    const notificacao = buildNotification('sugestaoProfessor', { id: pedidoId, data: dataFormatada, hora: novaHora });
    await createNotificacao(
      pedido.disponibilidade_mensal.professor.utilizador.iduser,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(pedidoId), notificacao.referencia_tipo
    );
  }

  await createAuditLog(null, 'Direcao', 'UPDATE', 'PedidoAula', parseInt(pedidoId), `Direção sugeriu nova data ${novaData}${novaHora ? ' ' + novaHora : ''}`);

  return pedido;
}

export async function responderSugestaoDirecao(aulaId, aceitar, direcaoUserId, novaData) {
  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(aulaId) },
    include: {
      encarregadoeducacao: { include: { utilizador: true } },
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } },
      },
    },
  });

  if (!pedido) throw new Error('Aula não encontrada');
  if (pedido.sugestaoestado !== 'AGUARDA_DIRECAO') {
    throw new Error('Não existe sugestão de professor pendente para esta aula');
  }

  const professorUserId = pedido.disponibilidade_mensal?.professor?.utilizadoriduser;
  const encarregadoUserId = pedido.encarregadoeducacao?.utilizadoriduser;

  if (!aceitar) {
    await prisma.pedidodeaula.update({
      where: { idpedidoaula: parseInt(aulaId) },
      data: { novadata: null, novaDataLimite: null, sugestaoestado: null },
    });
    if (professorUserId) {
      const notificacao = buildNotification('remarcacaoRejeitadaDirecao', { id: aulaId });
      await createNotificacao(
        professorUserId,
        notificacao.mensagem,
        notificacao.tipo,
        parseInt(aulaId), notificacao.referencia_tipo
      );
    }
    return { rejeitada: true };
  }

  // Direção accepts — if no date was proposed by Professor, novaData must be provided now
  const dataAUsar = pedido.novadata ? pedido.novadata : (novaData ? new Date(novaData) : null);
  if (!dataAUsar) throw new Error('Nova data é obrigatória quando o professor não propôs data');

  const dataFormatada = new Date(dataAUsar).toLocaleDateString('pt-PT');
  const tresHoras = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const updated = await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(aulaId) },
    data: { novadata: dataAUsar, novaDataLimite: tresHoras, sugestaoestado: 'AGUARDA_EE' },
  });

if (encarregadoUserId) {
    const notificacao = buildNotification('sugestaoEncarregado', { id: aulaId, data: dataFormatada, origem: 'A Direção' });
    await createNotificacao(
      encarregadoUserId,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(aulaId), notificacao.referencia_tipo
    );
  }

  await createAuditLog(direcaoUserId ? parseInt(direcaoUserId) : null, 'Direção', 'UPDATE', 'PedidoAula', parseInt(aulaId), aceitar ? `Direção aceitou sugestão` : `Direção rejeitou sugestão`);

  return updated;
}

// PRESENÇAS
export async function getPresencas(aulaId) {
  return prisma.presenca.findMany({
    where: { aulaidaula: parseInt(aulaId) },
    include: {
      aluno: {
        include: {
          utilizador: {
            select: { iduser: true, nome: true, email: true }
          }
        }
      }
    },
    orderBy: { datahora: 'desc' }
  });
}

export async function registrarPresenca(aulaId, alunoId, presente) {
  const aula = await prisma.aula.findUnique({
    where: { idaula: parseInt(aulaId) }
  });
  
  if (!aula) {
    throw new Error('Aula não encontrada');
  }
  
  const aluno = await prisma.aluno.findUnique({
    where: { idaluno: parseInt(alunoId) }
  });
  
  if (!aluno) {
    throw new Error('Aluno não encontrado');
  }
  
  // Verificar se o aluno participa desta aula
  const participation = await prisma.alunoaula.findFirst({
    where: {
      aulaidaula: parseInt(aulaId),
      alunoidaluno: parseInt(alunoId)
    }
  });
  
if (!participation) {
    throw new Error('Aluno não participa nesta aula');
  }

  const existing = await prisma.presenca.findFirst({
    where: {
      aulaidaula: parseInt(aulaId),
      alunoidaluno: parseInt(alunoId)
    }
  });
  
  if (existing) {
    return prisma.presenca.update({
      where: { idpresenca: existing.idpresenca },
      data: { presente, datahora: new Date() }
    });
  }
  
  // Criar nova presença
  return prisma.presenca.create({
    data: {
      aulaidaula: parseInt(aulaId),
      alunoidaluno: parseInt(alunoId),
      presente
    },
    include: {
      aluno: {
        include: { utilizador: true }
      }
    }
  });
}

export async function getPresencasByAluno(alunoId) {
  return prisma.presenca.findMany({
    where: { alunoidaluno: parseInt(alunoId) },
    include: {
      aula: {
        include: {
          pedidodeaula: true,
          estadoaula: true,
          sala: true
        }
      }
    },
    orderBy: { datahora: 'desc' }
  });
}

export async function getPresencasByDateRange(dataInicio, dataFim) {
  return prisma.presenca.findMany({
    where: {
      datahora: {
        gte: new Date(dataInicio),
        lte: new Date(dataFim)
      }
    },
    include: {
      aula: {
        include: {
          pedidodeaula: true,
          estadoaula: true,
          sala: true
        }
      },
      aluno: {
        include: { utilizador: true }
      }
    },
    orderBy: { datahora: 'desc' }
  });
}
