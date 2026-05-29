import { PrismaClient } from "@prisma/client";
import { createNotificacao } from "./notificacoes.service.js";
import { existeConflitoSala, existeConflitoProf, timeParaMinutos } from "../utils/coachingHelpers.js";

const prisma = new PrismaClient();

export const consultarAula = async () => {
  const aulas = await prisma.$queryRaw`
    SELECT
      pa.idpedidoaula,
      pa.data,
      pa.horainicio,
      pa.duracaoaula,
      pa.maxparticipantes,
      pa.estadoidestado,
      e.tipoestado as estado_nome,
      pa.privacidade,
      pa.datapedido,
      pa.novadata,
      pa.sugestaoestado,
      s.nomesala as sala_nome,
      s.idsala as sala_id,
      dm.salaid as slot_estudio_id,
      mp.modalidadeidmodalidade,
      m.nome as modalidade_nome,
      COALESCE(dm.professorutilizadoriduser, pa.professorutilizadoriduser) as professor_id,
      u.nome as professor_nome,
      alu.nome as aluno_nome,
      pa.alunoutilizadoriduser as aluno_utilizador_id,
      enc.nome as encarregado_nome,
      pa.encarregadoeducacaoutilizadoriduser as encarregado_id
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    LEFT JOIN sala s ON pa.salaidsala = s.idsala
    LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador u ON COALESCE(dm.professorutilizadoriduser, pa.professorutilizadoriduser) = u.iduser
    LEFT JOIN utilizador alu ON pa.alunoutilizadoriduser = alu.iduser
    LEFT JOIN utilizador enc ON pa.encarregadoeducacaoutilizadoriduser = enc.iduser
    ORDER BY pa.data DESC, pa.horainicio DESC
  `;

  const pedidoIds = aulas.map(a => a.idpedidoaula);
  const participantesMap = await getParticipantesPorPedidos(pedidoIds);

  return aulas.map(a => {
    const rawStatus = (a.estado_nome || '').toUpperCase();
    const hora = a.horainicio;
    const horaFmt = hora instanceof Date
      ? hora.toISOString().substring(11, 16)
      : String(hora).substring(0, 5);
    const [hH, hM] = horaFmt.split(':').map(Number);
    const inicioMin = hH * 60 + (hM || 0);

    const durRaw = a.duracaoaula;
    let duracaoMin = 60;
    if (durRaw) {
      if (durRaw instanceof Date) {
        duracaoMin = durRaw.getUTCHours() * 60 + durRaw.getUTCMinutes();
      } else {
        const parts = String(durRaw).split(':');
        duracaoMin = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0');
      }
    }
    const endMin = inicioMin + duracaoMin;
    const horaFim = String(Math.floor(endMin / 60)).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');

    const statusMap = {
      'PENDENTE': 'PENDENTE',
      'CONFIRMADO': 'CONFIRMADA',
      'APROVADO': 'APROVADA',
      'REJEITADO': 'REJEITADA',
      'REALIZADO': 'REALIZADA',
      'CANCELADO': 'CANCELADA',
      'CONCLUÍDO': 'REALIZADA',
    };
    const normalizedStatus = statusMap[rawStatus] || rawStatus;

    return {
      id: String(a.idpedidoaula),
      alunoId: String(a.aluno_utilizador_id || ''),
      alunoNome: a.aluno_nome || '',
      encarregadoId: String(a.encarregado_id || ''),
      encarregadoNome: a.encarregado_nome || '',
      professorId: String(a.professor_id || ''),
      professorNome: a.professor_nome || '',
      estudioId: String(a.sala_id || ''),
      estudioNome: a.sala_nome || '',
      slotEstudioId: String(a.slot_estudio_id || ''),
      modalidade: a.modalidade_nome || '',
      data: a.data ? new Date(a.data).toISOString().split('T')[0] : '',
      horaInicio: horaFmt,
      horaFim,
      duracao: duracaoMin,
      status: normalizedStatus,
      maxParticipantes: a.maxparticipantes || 0,
      criadoEm: a.datapedido ? new Date(a.datapedido).toISOString() : '',
      novaData: a.novadata || '',
      sugestaoestado: a.sugestaoestado || null,
      participantes: participantesMap[a.idpedidoaula] || []
    };
  });
};

export const getPendingAulas = async () => {
  const aulas = await prisma.$queryRaw`
    SELECT
      pa.idpedidoaula,
      pa.data,
      pa.horainicio,
      pa.duracaoaula,
      pa.maxparticipantes,
      pa.estadoidestado,
      e.tipoestado as estado_nome,
      pa.privacidade,
      pa.datapedido,
      pa.alunoutilizadoriduser as pedido_aluno_id,
      alu.nome as aluno_nome,
      s.nomesala as sala_nome,
      pa.disponibilidade_mensal_id as slot_id,
      mp.modalidadeidmodalidade,
      m.nome as modalidade_nome,
      dm.professorutilizadoriduser as professor_id,
      u.nome as professor_nome,
      enc.nome as encarregado_nome,
      pa.encarregadoeducacaoutilizadoriduser as encarregado_id,
      s.idsala as sala_id,
      dm.salaid as slot_estudio_id
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    LEFT JOIN sala s ON pa.salaidsala = s.idsala
    LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador u ON dm.professorutilizadoriduser = u.iduser
    LEFT JOIN utilizador alu ON pa.alunoutilizadoriduser = alu.iduser
    LEFT JOIN utilizador enc ON pa.encarregadoeducacaoutilizadoriduser = enc.iduser
    WHERE LOWER(e.tipoestado) = 'pendente'
    ORDER BY pa.data ASC, pa.horainicio ASC
  `;

  const pedidoIds = aulas.map(a => a.idpedidoaula);
  const participantesMap = await getParticipantesPorPedidos(pedidoIds);

  return aulas.map(a => {
    let horaFmt = '';
    const hora = a.horainicio;
    if (hora) {
      if (hora instanceof Date) {
        horaFmt = hora.toISOString().substring(11, 16);
      } else if (typeof hora === 'string') {
        horaFmt = hora.substring(0, 5);
      } else {
        horaFmt = String(hora).substring(0, 5);
      }
    }
    
    let duracaoFmt = 60;
    const duracao = a.duracaoaula;
    if (duracao) {
      if (duracao instanceof Date) {
        duracaoFmt = duracao.getHours() * 60 + duracao.getMinutes();
      } else if (typeof duracao === 'string') {
        const parts = duracao.split(':');
        if (parts.length >= 2) {
          duracaoFmt = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else {
          duracaoFmt = parseInt(duracao) || 60;
        }
      }
    }
    
    const [hH2, hM2] = horaFmt.split(':').map(Number);
    const endMin2 = hH2 * 60 + (hM2 || 0) + duracaoFmt;
    const horaFim = String(Math.floor(endMin2 / 60)).padStart(2, '0') + ':' + String(endMin2 % 60).padStart(2, '0');

    return {
      id: String(a.idpedidoaula),
      alunoId: String(a.pedido_aluno_id || ''),
      alunoNome: a.aluno_nome || '',
      encarregadoId: String(a.encarregado_id || ''),
      encarregadoNome: a.encarregado_nome || '',
      professorId: String(a.professor_id || ''),
      professorNome: a.professor_nome || '',
      estudioId: String(a.sala_id || ''),
      estudioNome: a.sala_nome || '',
      slotEstudioId: String(a.slot_estudio_id || ''),
      modalidade: a.modalidade_nome || '',
      data: a.data ? new Date(a.data).toISOString().split('T')[0] : '',
      horaInicio: horaFmt,
      horaFim,
      duracao: duracaoFmt,
      status: a.estado_nome || '',
      maxParticipantes: a.maxparticipantes || 0,
      criadoEm: a.datapedido ? new Date(a.datapedido).toISOString() : '',
      participantes: participantesMap[a.idpedidoaula] || []
    };
  });
};

export const avaliarPedido = async (id, decisao, salaId, motivo) => {
  if (decisao === 'aprovar') {
    const estadoConfirmada = await prisma.$queryRaw`
      SELECT idestado FROM estado WHERE LOWER(tipoestado) = 'confirmado'
    `;
    if (!estadoConfirmada || estadoConfirmada.length === 0) {
      throw new Error('Estado CONFIRMADA não encontrado');
    }
    const pedido = await prisma.pedidodeaula.findUnique({
      where: { idpedidoaula: parseInt(id) },
      include: { estado: true, encarregadoeducacao: { include: { utilizador: true } }, disponibilidade_mensal: { include: { professor: { include: { utilizador: true } } } } }
    });
    if (!pedido) throw new Error('Pedido não encontrado');
    if (pedido.estado && pedido.estado.tipoestado.toLowerCase() === 'confirmado') throw new Error('O pedido já foi aprovado anteriormente');
    if (pedido.estado && pedido.estado.tipoestado.toLowerCase() === 'rejeitado') throw new Error('Não é possível aprovar um pedido que foi rejeitado');

    const salaIdsala = salaId ? parseInt(salaId) : pedido.salaidsala;
    if (!salaIdsala) {
      throw new Error('É necessário selecionar um estúdio antes de aprovar o coaching.');
    }
    const inicioMin = timeParaMinutos(pedido.horainicio);
    const duracaoMin = timeParaMinutos(pedido.duracaoaula);
    const fimMin = inicioMin + duracaoMin;

    const conflitoSala = await existeConflitoSala(
      salaIdsala, pedido.data, inicioMin, fimMin, pedido.idpedidoaula
    );
    if (conflitoSala) {
      throw new Error('Sala/Estúdio já está ocupado neste horário. Selecione outra sala ou cancele a aula conflituosa primeiro.');
    }

    if (pedido.disponibilidade_mensal?.professor?.utilizadoriduser) {
      const conflitoProf = await existeConflitoProf(
        pedido.disponibilidade_mensal.professor.utilizadoriduser,
        pedido.data, inicioMin, fimMin, pedido.idpedidoaula
      );
      if (conflitoProf) {
        throw new Error('Professor já tem outra aula neste horário.');
      }
    }

    if (salaId) {
      await prisma.$queryRaw`UPDATE pedidodeaula SET salaidsala = ${parseInt(salaId)} WHERE idpedidoaula = ${parseInt(id)}`;
    }
    await prisma.$queryRaw`UPDATE pedidodeaula SET estadoidestado = ${estadoConfirmada[0].idestado} WHERE idpedidoaula = ${parseInt(id)}`;

    // Create aula record for presences and management
    const estadoAulaConfirmada = await prisma.estadoaula.findFirst({
      where: { nomeestadoaula: { equals: 'CONFIRMADA', mode: 'insensitive' } },
    });
    let novaAula = null;
    if (estadoAulaConfirmada) {
      novaAula = await prisma.aula.create({
        data: {
          pedidodeaulaidpedidoaula: parseInt(id),
          salaidsala: salaIdsala,
          estadoaulaidestadoaula: estadoAulaConfirmada.idestadoaula,
        },
      });
    }

    // P-01: Propagate alunos from alunopedidoaula to alunoaula
    if (novaAula) {
      const alunosDoPedido = await prisma.alunopedidoaula.findMany({
        where: { pedidodeaulaidpedidoaula: parseInt(id) },
      });
      for (const ap of alunosDoPedido) {
        await prisma.alunoaula.create({
          data: {
            alunoidaluno: ap.alunoidaluno,
            aulaidaula: novaAula.idaula,
          },
        });
      }
    }

    if (pedido?.encarregadoeducacao) {
      const dataStr = pedido.data ? new Date(pedido.data).toLocaleDateString('pt-PT') : '';
      const horaStr = pedido.horainicio ? `${String(pedido.horainicio.getUTCHours()).padStart(2, '0')}:${String(pedido.horainicio.getUTCMinutes()).padStart(2, '0')}` : '';
      await createNotificacao(pedido.encarregadoeducacao.utilizadoriduser, `✅ A sua aula foi aprovada! Data: ${dataStr} às ${horaStr}`, 'AULA_APROVADA', parseInt(id), 'coaching');
    }
    if (pedido?.disponibilidade_mensal?.professor) {
      const dataStr = pedido.data ? new Date(pedido.data).toLocaleDateString('pt-PT') : '';
      const horaStr = pedido.horainicio ? `${String(pedido.horainicio.getUTCHours()).padStart(2, '0')}:${String(pedido.horainicio.getUTCMinutes()).padStart(2, '0')}` : '';
      await createNotificacao(pedido.disponibilidade_mensal.professor.utilizadoriduser, `📅 Nova aula confirmada para ${dataStr} às ${horaStr}`, 'AULA_CONFIRMADA', parseInt(id), 'coaching');
    }

    // ── Split disponibilidade se o pedido usar apenas parte do slot ──
    if (pedido.disponibilidade_mensal_id && pedido.duracaoaula && pedido.horainicio) {
      const disp = pedido.disponibilidade_mensal;
      if (disp) {
        const timeToMin = (t) => {
          const s = t instanceof Date ? t.toISOString().substring(11, 16) : String(t).substring(0, 5);
          const [h, m] = s.split(':').map(Number);
          return h * 60 + (m || 0);
        };
        const getDuracaoMin = (durRaw) => {
          if (!durRaw) return 60;
          if (durRaw instanceof Date) return durRaw.getUTCHours() * 60 + durRaw.getUTCMinutes();
          const parts = String(durRaw).split(':');
          return parseInt(parts[0]) * 60 + parseInt(parts[1] || '0');
        };
        const fmtTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
        // Format data for SQL
        const dataStr = pedido.data instanceof Date
          ? pedido.data.toISOString().split('T')[0]
          : String(pedido.data).split('T')[0];

        const dispStart = timeToMin(disp.horainicio);
        const dispEnd = timeToMin(disp.horafim);
        const pedStart = timeToMin(pedido.horainicio);
        const pedDuration = getDuracaoMin(pedido.duracaoaula);
        const pedEnd = pedStart + pedDuration;

        const freeBefore = pedStart - dispStart;
        const freeAfter = dispEnd - pedEnd;

        if (freeBefore > 0 && freeAfter > 0) {
          // Booking in the MIDDLE → original fica com freeBefore, cria nova disp para freeAfter
          const newHoraFim = fmtTime(pedStart);
          await prisma.$queryRawUnsafe(`
            UPDATE disponibilidade_mensal
            SET horafim = $1::time,
                minutos_ocupados = 0
            WHERE iddisponibilidade_mensal = $2
          `, newHoraFim, pedido.disponibilidade_mensal_id);

          // Create new disponibilidade for the freeAfter portion
          const newHoraInicio = fmtTime(pedEnd);
          const dispHoraFim = fmtTime(dispEnd);
          await prisma.$queryRawUnsafe(`
            INSERT INTO disponibilidade_mensal
            (professorutilizadoriduser, modalidadesprofessoridmodalidadeprofessor, data, horainicio, horafim, ativo, salaid, minutos_ocupados)
            VALUES ($1, $2, $3::date, $4::time, $5::time, true, $6, 0)
          `, disp.professorutilizadoriduser, disp.modalidadesprofessoridmodalidadeprofessor,
             dataStr, newHoraInicio, dispHoraFim, disp.salaid);
        } else if (freeBefore > 0) {
          // Free time BEFORE booking → original termina no início do booking
          const newHoraFim = fmtTime(pedStart);
          await prisma.$queryRawUnsafe(`
            UPDATE disponibilidade_mensal
            SET horafim = $1::time,
                minutos_ocupados = 0
            WHERE iddisponibilidade_mensal = $2
          `, newHoraFim, pedido.disponibilidade_mensal_id);
        } else if (freeAfter > 0) {
          // Free time AFTER booking → original começa no fim do booking
          const newHoraInicio = fmtTime(pedEnd);
          await prisma.$queryRawUnsafe(`
            UPDATE disponibilidade_mensal
            SET horainicio = $1::time,
                minutos_ocupados = 0
            WHERE iddisponibilidade_mensal = $2
          `, newHoraInicio, pedido.disponibilidade_mensal_id);
        }
        // freeBefore === 0 && freeAfter === 0: booking ocupa o slot inteiro → sem split
      }
    }

    return { success: true };
  }
  if (decisao === 'rejeitar') {
    const estadoRejeitada = await prisma.$queryRaw`SELECT idestado FROM estado WHERE LOWER(tipoestado) = 'rejeitado'`;
    if (!estadoRejeitada || estadoRejeitada.length === 0) throw new Error('Estado REJEITADA não encontrado');
    const pedido = await prisma.pedidodeaula.findUnique({ where: { idpedidoaula: parseInt(id) }, include: { encarregadoeducacao: true } });
    const result = await prisma.$queryRaw`UPDATE pedidodeaula SET estadoidestado = ${estadoRejeitada[0].idestado}, motivorejeicao = ${motivo} WHERE idpedidoaula = ${parseInt(id)} RETURNING idpedidoaula, data, horainicio, estadoidestado`;
    if (pedido?.encarregadoeducacao) {
      await createNotificacao(pedido.encarregadoeducacao.utilizadoriduser, `❌ A sua aula foi rejeitada. Motivo: ${motivo}. Se pretender reagendar, consulte as disponibilidades dos professores e submeta um novo pedido.`, 'AULA_REJEITADA', parseInt(id), 'coaching');
    }

    // Devolver minutos ocupados à disponibilidade
    if (pedido?.disponibilidade_mensal_id && pedido.duracaoaula) {
      const getDuracaoMin = (durRaw) => {
        if (!durRaw) return 60;
        if (durRaw instanceof Date) return durRaw.getUTCHours() * 60 + durRaw.getUTCMinutes();
        const parts = String(durRaw).split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1] || '0');
      };
      const duracaoMin = getDuracaoMin(pedido.duracaoaula);
      await prisma.$queryRawUnsafe(`
        UPDATE disponibilidade_mensal
        SET minutos_ocupados = GREATEST(0, minutos_ocupados - $1)
        WHERE iddisponibilidade_mensal = $2
      `, duracaoMin, pedido.disponibilidade_mensal_id);
    }

    return result;
  }
};

export const confirmarAulaRealizada = async (id) => {
  const estadoConcluido = await prisma.estado.findFirst({
    where: { tipoestado: { equals: 'Concluído', mode: 'insensitive' } },
  });
  if (!estadoConcluido) throw new Error('Estado Concluído não encontrado');

  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(id) },
    include: {
      encarregadoeducacao: { include: { utilizador: true } },
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } }
      }
    }
  });
  if (!pedido) throw new Error('Aula não encontrada');

  const result = await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(id) },
    data: { estadoidestado: estadoConcluido.idestado },
  });

  const estadoAulaRealizada = await prisma.estadoaula.findFirst({
    where: { nomeestadoaula: { equals: 'REALIZADA', mode: 'insensitive' } },
  });
  if (estadoAulaRealizada) {
    await prisma.aula.updateMany({
      where: { pedidodeaulaidpedidoaula: parseInt(id) },
      data: { estadoaulaidestadoaula: estadoAulaRealizada.idestadoaula },
    });
  }

  if (pedido.encarregadoeducacao) {
    await createNotificacao(
      pedido.encarregadoeducacao.utilizadoriduser,
      `✅ A aula do dia ${pedido.data ? new Date(pedido.data).toLocaleDateString('pt-PT') : ''} foi confirmada como realizada.`,
      'AULA_REALIZADA',
      parseInt(id), 'coaching'
    );
  }

  return result;
};

export const cancelarPedidoAula = async (id) => {
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
  if (!pedido) throw new Error('Pedido de aula não encontrado');

  if (pedido.estado && pedido.estado.tipoestado.toLowerCase() === 'cancelado') {
    throw new Error('O pedido já foi cancelado anteriormente');
  }

  const result = await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(id) },
    data: { estadoidestado: estadoCancelado.idestado },
  });

  const estadoAulaCancelada = await prisma.estadoaula.findFirst({
    where: { nomeestadoaula: { equals: 'CANCELADA', mode: 'insensitive' } },
  });
  if (estadoAulaCancelada) {
    await prisma.aula.updateMany({
      where: { pedidodeaulaidpedidoaula: parseInt(id) },
      data: { estadoaulaidestadoaula: estadoAulaCancelada.idestadoaula },
    });
  }

  if (pedido.disponibilidade_mensal_id && pedido.duracaoaula) {
    const getDuracaoMin = (durRaw) => {
      if (!durRaw) return 60;
      if (durRaw instanceof Date) return durRaw.getUTCHours() * 60 + durRaw.getUTCMinutes();
      const parts = String(durRaw).split(':');
      return parseInt(parts[0]) * 60 + parseInt(parts[1] || '0');
    };
    const duracaoMin = getDuracaoMin(pedido.duracaoaula);
    await prisma.$queryRawUnsafe(`
      UPDATE disponibilidade_mensal
      SET minutos_ocupados = GREATEST(0, minutos_ocupados - $1)
      WHERE iddisponibilidade_mensal = $2
    `, duracaoMin, pedido.disponibilidade_mensal_id);
  }

  const dataStr = pedido.data ? new Date(pedido.data).toLocaleDateString('pt-PT') : '';
  const horaStr = pedido.horainicio
    ? `${String(pedido.horainicio.getUTCHours()).padStart(2, '0')}:${String(pedido.horainicio.getUTCMinutes()).padStart(2, '0')}`
    : '';

  if (pedido.encarregadoeducacao) {
    await createNotificacao(
      pedido.encarregadoeducacao.utilizadoriduser,
      `❌ A aula do dia ${dataStr} às ${horaStr} foi cancelada pela direção.`,
      'AULA_CANCELADA',
      parseInt(id), 'coaching'
    );
  }
  if (pedido.disponibilidade_mensal?.professor) {
    await createNotificacao(
      pedido.disponibilidade_mensal.professor.utilizadoriduser,
      `❌ A aula do dia ${dataStr} às ${horaStr} foi cancelada pela direção.`,
      'AULA_CANCELADA',
      parseInt(id), 'coaching'
    );
  }

  return result;
};

export const editarSalaPedidoAula = async (id, salaId) => {
  if (!salaId) throw new Error('salaId é obrigatório');

  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(id) },
  });
  if (!pedido) throw new Error('Pedido de aula não encontrado');

  const sala = await prisma.sala.findUnique({
    where: { idsala: parseInt(salaId) },
  });
  if (!sala) throw new Error('Sala não encontrada');

  await prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(id) },
    data: { salaidsala: parseInt(salaId) },
  });

  await prisma.aula.updateMany({
    where: { pedidodeaulaidpedidoaula: parseInt(id) },
    data: { salaidsala: parseInt(salaId) },
  });

  return { ...pedido, salaidsala: parseInt(salaId), sala };
};

export const getRelatorioAulasMensal = async (ano, mes) => {
  const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
  const fim = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59);

  const pedidos = await prisma.$queryRaw`
    SELECT 
      DATE(pa.data) as data_aula,
      COUNT(*) as total_aulas,
      SUM(pa.maxparticipantes) as total_participantes
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    WHERE pa.data >= ${inicio} AND pa.data <= ${fim}
      AND LOWER(e.tipoestado) IN ('confirmado', 'concluído', 'aprovado')
    GROUP BY DATE(pa.data)
    ORDER BY data_aula ASC
  `;

  const totalGeral = await prisma.$queryRaw`
    SELECT COUNT(*) as total FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    WHERE pa.data >= ${inicio} AND pa.data <= ${fim}
      AND LOWER(e.tipoestado) IN ('confirmado', 'concluído', 'aprovado')
  `;

  return {
    periodo: { ano: parseInt(ano), mes: parseInt(mes) },
    totalAulas: totalGeral[0]?.total || 0,
    detalhe: pedidos.map(p => ({
      data: p.data_aula ? new Date(p.data_aula).toISOString().split('T')[0] : '',
      total: parseInt(p.total_aulas),
      participantes: parseInt(p.total_participantes)
    }))
  };
};

export const getRelatorioPresencas = async (dataInicio, dataFim) => {
  return prisma.$queryRaw`
    SELECT 
      a.idaula,
      pa.data as data_aula,
      u.nome as aluno_nome,
      p.presente,
      p.datahora
    FROM presenca p
    JOIN aluno al ON p.alunoidaluno = al.idaluno
    JOIN utilizador u ON al.utilizadoriduser = u.iduser
    JOIN aula a ON p.aulaidaula = a.idaula
    JOIN pedidodeaula pa ON a.pedidodeaulaidpedidoaula = pa.idpedidoaula
    WHERE p.datahora >= ${new Date(dataInicio)} AND p.datahora <= ${new Date(dataFim)}
    ORDER BY pa.data ASC, u.nome ASC
  `;
};

async function getParticipantesPorPedidos(pedidoIds) {
  if (!pedidoIds || pedidoIds.length === 0) return {};
  const rows = await prisma.$queryRaw`
    SELECT
      apa.pedidodeaulaidpedidoaula,
      u.iduser as aluno_utilizador_id,
      u.nome as aluno_nome,
      a.encarregadoiduser as encarregado_id
    FROM alunopedidoaula apa
    JOIN aluno a ON apa.alunoidaluno = a.idaluno
    JOIN utilizador u ON a.utilizadoriduser = u.iduser
    WHERE apa.pedidodeaulaidpedidoaula = ANY(${pedidoIds})
  `;
  const map = {};
  for (const r of rows) {
    const pid = Number(r.pedidodeaulaidpedidoaula);
    if (!map[pid]) map[pid] = [];
    map[pid].push({
      alunoId: String(r.aluno_utilizador_id),
      alunoNome: r.aluno_nome || '',
      encarregadoId: String(r.encarregado_id || '')
    });
  }
  return map;
};

export const criarOcupacaoSala = async (dados, userId) => {
  const { salaId, data, horainicio, horafim, tipo, responsavel, observacoes } = dados;

  if (!salaId || !data || !horainicio || !horafim) {
    throw new Error('Campos obrigatórios: salaId, data, horainicio, horafim');
  }

  // Calcular duração em minutos
  const [hIni, mIni] = horainicio.split(':').map(Number);
  const [hFim, mFim] = horafim.split(':').map(Number);
  const durMin = (hFim * 60 + mFim) - (hIni * 60 + mIni);
  if (durMin <= 0) throw new Error('Hora de fim deve ser posterior à hora de início');

  // Duração como TIME
  const durHoras = Math.floor(durMin / 60);
  const durResto = durMin % 60;
  const duracaoTime = `${String(durHoras).padStart(2, '0')}:${String(durResto).padStart(2, '0')}:00`;

  // Verificar conflito: mesma sala, mesma data, horários sobrepostos
  const conflito = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS total
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    WHERE pa.salaidsala = $1
    AND pa.data = $2::date
    AND LOWER(e.tipoestado) IN ('confirmado', 'pendente', 'aprovado')
    AND $3::time < (pa.horainicio + pa.duracaoaula::text::interval)
    AND ($3::time + $4 * INTERVAL '1 minute') > pa.horainicio
  `, parseInt(salaId), data, horainicio + ':00', durMin);

  if (parseInt(conflito[0]?.total) > 0) {
    throw new Error('Este estúdio já tem uma ocupação neste horário.');
  }

  // Buscar estado "Confirmado" (id 2)
  const estadoConfirmado = await prisma.estado.findFirst({
    where: { tipoestado: { equals: 'Confirmado', mode: 'insensitive' } },
  });
  if (!estadoConfirmado) throw new Error('Estado Confirmado não encontrado');

  // Criar pedidodeaula (ocupação de sala)
  const result = await prisma.$queryRawUnsafe(`
    INSERT INTO pedidodeaula (
      data, horainicio, duracaoaula, maxparticipantes, privacidade,
      estadoidestado, salaidsala, encarregadoeducacaoutilizadoriduser,
      alunoutilizadoriduser, professorutilizadoriduser, datapedido
    ) VALUES (
      $1::date, $2::time, $3::time, 1, true,
      $4, $5, NULL,
      NULL, NULL, NOW()
    )
    RETURNING idpedidoaula
  `, data, horainicio + ':00', duracaoTime,
     estadoConfirmado.idestado, parseInt(salaId), parseInt(userId));

  const pedidoId = result[0]?.idpedidoaula;
  if (!pedidoId) throw new Error('Erro ao criar ocupação');

  const estadoAulaConfirmada = await prisma.estadoaula.findFirst({
    where: { nomeestadoaula: { equals: 'CONFIRMADA', mode: 'insensitive' } },
  });
  if (estadoAulaConfirmada) {
    await prisma.aula.create({
      data: {
        pedidodeaulaidpedidoaula: pedidoId,
        salaidsala: parseInt(salaId),
        estadoaulaidestadoaula: estadoAulaConfirmada.idestadoaula,
      },
    });
  }

  return {
    id: String(pedidoId),
    salaId: String(salaId),
    data,
    horainicio,
    horafim,
    duracao: durMin,
    tipo: tipo || 'Outro',
    responsavel: responsavel || '',
    observacoes: observacoes || '',
    status: 'CONFIRMADO',
  };
};
