import { PrismaClient } from "@prisma/client";
import { createNotificacao } from "./notificacoes.service.js";
import { existeConflitoSala, existeConflitoProf, timeParaMinutos } from "../utils/coachingHelpers.js";
import { recalcularMinutosOcupados } from "../utils/disponibilidadeOcupacao.js";
import { buildNotification } from "../utils/notificationTemplates.js";

const prisma = new PrismaClient();

const timeToHHMM = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    return value.toISOString().substring(11, 16);
  }
  return String(value).substring(0, 5);
};

const parseDurationMinutes = (value) => {
  if (!value) return 60;
  if (value instanceof Date) {
    return value.getUTCHours() * 60 + value.getUTCMinutes();
  }
  const parts = String(value).split(':');
  const horas = parseInt(parts[0] || '0', 10);
  const minutos = parseInt(parts[1] || '0', 10);
  return horas * 60 + minutos;
};

const mapPedidoAulaRow = (a, participantesMap = {}) => {
  const horaFmt = timeToHHMM(a.horainicio);
  const [hH, hM] = horaFmt.split(':').map(Number);
  const inicioMin = (hH || 0) * 60 + (hM || 0);
  const duracaoMin = parseDurationMinutes(a.duracaoaula);
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
  const rawStatus = (a.estado_nome || '').toUpperCase();
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
    participantes: participantesMap[a.idpedidoaula] || [],
    tipoOcupacao: a.tipo_ocupacao || null,
    responsavel: a.responsavel || null,
    observacoes: a.observacoes || null,
  };
};

const mapSalaOcupacaoRow = (o) => ({
  id: String(o.idsalaocupacao),
  alunoId: '',
  alunoNome: '',
  encarregadoId: '',
  encarregadoNome: '',
  professorId: '',
  professorNome: '',
  estudioId: String(o.sala_id || ''),
  estudioNome: o.sala_nome || '',
  slotEstudioId: '',
  modalidade: '',
  data: o.data ? new Date(o.data).toISOString().split('T')[0] : '',
  horaInicio: timeToHHMM(o.horainicio),
  horaFim: timeToHHMM(o.horafim),
  duracao: o.horainicio && o.horafim
    ? Math.max(0, (() => {
        const inicio = timeToHHMM(o.horainicio).split(':').map(Number);
        const fim = timeToHHMM(o.horafim).split(':').map(Number);
        return ((fim[0] || 0) * 60 + (fim[1] || 0)) - ((inicio[0] || 0) * 60 + (inicio[1] || 0));
      })())
    : 0,
  status: 'CONFIRMADA',
  maxParticipantes: 1,
  criadoEm: o.datacriacao ? new Date(o.datacriacao).toISOString() : '',
  novaData: null,
  sugestaoestado: null,
  participantes: [],
  tipoOcupacao: o.tipo_ocupacao || 'Outro',
  responsavel: o.responsavel || '',
  observacoes: o.observacoes || '',
});

async function existeConflitoSalaOcupacao({ salaId, data, inicioHora, inicioMin, durMin, excluirPedidoId = null, excluirOcupacaoId = null }) {
  const conflitoPedidoSql = `
    SELECT COUNT(*) AS total
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    WHERE pa.salaidsala = $1
      AND pa.data = $2::date
      AND pa.tipo_ocupacao IS NULL
      ${excluirPedidoId ? 'AND pa.idpedidoaula != $5' : ''}
      AND LOWER(e.tipoestado) IN ('confirmado', 'pendente', 'aprovado')
      AND $3::time < (pa.horainicio + pa.duracaoaula::text::interval)
      AND ($3::time + $4 * INTERVAL '1 minute') > pa.horainicio
  `;
  const conflitoPedidos = excluirPedidoId
    ? await prisma.$queryRawUnsafe(conflitoPedidoSql, parseInt(salaId), data, inicioHora, durMin, parseInt(excluirPedidoId))
    : await prisma.$queryRawUnsafe(conflitoPedidoSql, parseInt(salaId), data, inicioHora, durMin);

  if (parseInt(conflitoPedidos[0]?.total) > 0) return true;

  const conflitoOcupacaoSql = `
    SELECT COUNT(*) AS total
    FROM salaocupacao so
    WHERE so.salaidsala = $1
      AND so.data = $2::date
      ${excluirOcupacaoId ? 'AND so.idsalaocupacao != $5' : ''}
      AND $3::time < so.horafim
      AND ($3::time + $4 * INTERVAL '1 minute') > so.horainicio
  `;
  const conflitoOcupacoes = excluirOcupacaoId
    ? await prisma.$queryRawUnsafe(conflitoOcupacaoSql, parseInt(salaId), data, inicioHora, durMin, parseInt(excluirOcupacaoId))
    : await prisma.$queryRawUnsafe(conflitoOcupacaoSql, parseInt(salaId), data, inicioHora, durMin);

  return parseInt(conflitoOcupacoes[0]?.total) > 0;
}

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
      pa.encarregadoeducacaoutilizadoriduser as encarregado_id,
      pa.tipo_ocupacao,
      pa.responsavel,
      pa.observacoes
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    LEFT JOIN sala s ON pa.salaidsala = s.idsala
    LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador u ON COALESCE(dm.professorutilizadoriduser, pa.professorutilizadoriduser) = u.iduser
    LEFT JOIN utilizador alu ON pa.alunoutilizadoriduser = alu.iduser
    LEFT JOIN utilizador enc ON pa.encarregadoeducacaoutilizadoriduser = enc.iduser
    WHERE pa.tipo_ocupacao IS NULL
    ORDER BY pa.data DESC, pa.horainicio DESC
  `;

  const ocupacoes = await prisma.$queryRaw`
    SELECT
      so.idsalaocupacao,
      so.data,
      so.horainicio,
      so.horafim,
      so.tipo_ocupacao,
      so.responsavel,
      so.observacoes,
      so.datacriacao,
      s.nomesala as sala_nome,
      s.idsala as sala_id
    FROM salaocupacao so
    LEFT JOIN sala s ON so.salaidsala = s.idsala
    ORDER BY so.data DESC, so.horainicio DESC
  `;

  const pedidoIds = aulas.map(a => a.idpedidoaula);
  const participantesMap = await getParticipantesPorPedidos(pedidoIds);

  const combinadas = [
    ...aulas.map(a => mapPedidoAulaRow(a, participantesMap)),
    ...ocupacoes.map(mapSalaOcupacaoRow),
  ];

  return combinadas.sort((a, b) => {
    const dataA = `${a.data}T${a.horaInicio || '00:00'}`;
    const dataB = `${b.data}T${b.horaInicio || '00:00'}`;
    return new Date(dataB).getTime() - new Date(dataA).getTime();
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
      AND pa.tipo_ocupacao IS NULL
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
      throw new Error('Estado CONFIRMADO não encontrado');
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
      where: { nomeestadoaula: { equals: 'CONFIRMADO', mode: 'insensitive' } },
    });
    let novaAula = null;
    if (estadoAulaConfirmada) {
      novaAula = await prisma.aula.create({
        data: {
          pedidodeaulaidpedidoaula: parseInt(id),
          salaidsala: parseInt(salaId),
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
      const notificacao = buildNotification('pedidoAprovadoEncarregado', { data: dataStr, hora: horaStr });
      await createNotificacao(pedido.encarregadoeducacao.utilizadoriduser, notificacao.mensagem, notificacao.tipo, parseInt(id), notificacao.referencia_tipo);
    }
    if (pedido?.disponibilidade_mensal?.professor) {
      const dataStr = pedido.data ? new Date(pedido.data).toLocaleDateString('pt-PT') : '';
      const horaStr = pedido.horainicio ? `${String(pedido.horainicio.getUTCHours()).padStart(2, '0')}:${String(pedido.horainicio.getUTCMinutes()).padStart(2, '0')}` : '';
      const notificacao = buildNotification('pedidoAprovadoProfessor', { data: dataStr, hora: horaStr });
      await createNotificacao(pedido.disponibilidade_mensal.professor.utilizadoriduser, notificacao.mensagem, notificacao.tipo, parseInt(id), notificacao.referencia_tipo);
    }

    await recalcularMinutosOcupados(prisma, pedido.disponibilidade_mensal_id);

    return { success: true };
  }
  if (decisao === 'rejeitar') {
    const estadoRejeitada = await prisma.$queryRaw`SELECT idestado FROM estado WHERE LOWER(tipoestado) = 'rejeitado'`;
    if (!estadoRejeitada || estadoRejeitada.length === 0) throw new Error('Estado REJEITADA não encontrado');
    const pedido = await prisma.pedidodeaula.findUnique({ where: { idpedidoaula: parseInt(id) }, include: { encarregadoeducacao: true } });
    const result = await prisma.$queryRaw`UPDATE pedidodeaula SET estadoidestado = ${estadoRejeitada[0].idestado}, motivorejeicao = ${motivo} WHERE idpedidoaula = ${parseInt(id)} RETURNING idpedidoaula, data, horainicio, estadoidestado`;
    if (pedido?.encarregadoeducacao) {
      const notificacao = buildNotification('pedidoRejeitado', { motivo });
      await createNotificacao(pedido.encarregadoeducacao.utilizadoriduser, notificacao.mensagem, notificacao.tipo, parseInt(id), notificacao.referencia_tipo);
    }

    await recalcularMinutosOcupados(prisma, pedido?.disponibilidade_mensal_id);

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
    where: { nomeestadoaula: { equals: 'REALIZADO', mode: 'insensitive' } },
  });
  if (estadoAulaRealizada) {
    await prisma.aula.updateMany({
      where: { pedidodeaulaidpedidoaula: parseInt(id) },
      data: { estadoaulaidestadoaula: estadoAulaRealizada.idestadoaula },
    });
  }

  await recalcularMinutosOcupados(prisma, pedido.disponibilidade_mensal_id);

  if (pedido.encarregadoeducacao) {
    const notificacao = buildNotification('aulaRealizada', { data: pedido.data });
    await createNotificacao(
      pedido.encarregadoeducacao.utilizadoriduser,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(id), notificacao.referencia_tipo
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
    where: { nomeestadoaula: { equals: 'CANCELADO', mode: 'insensitive' } },
  });
  if (estadoAulaCancelada) {
    await prisma.aula.updateMany({
      where: { pedidodeaulaidpedidoaula: parseInt(id) },
      data: { estadoaulaidestadoaula: estadoAulaCancelada.idestadoaula },
    });
  }

  await recalcularMinutosOcupados(prisma, pedido.disponibilidade_mensal_id);

  const dataStr = pedido.data ? new Date(pedido.data).toLocaleDateString('pt-PT') : '';
  const horaStr = pedido.horainicio
    ? `${String(pedido.horainicio.getUTCHours()).padStart(2, '0')}:${String(pedido.horainicio.getUTCMinutes()).padStart(2, '0')}`
    : '';

  if (pedido.encarregadoeducacao) {
    const notificacao = buildNotification('aulaCancelada', { data: dataStr, hora: horaStr, origem: 'direção' });
    await createNotificacao(
      pedido.encarregadoeducacao.utilizadoriduser,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(id), notificacao.referencia_tipo
    );
  }
  if (pedido.disponibilidade_mensal?.professor) {
    const notificacao = buildNotification('aulaCancelada', { data: dataStr, hora: horaStr, origem: 'direção' });
    await createNotificacao(
      pedido.disponibilidade_mensal.professor.utilizadoriduser,
      notificacao.mensagem,
      notificacao.tipo,
      parseInt(id), notificacao.referencia_tipo
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

  const [hIni, mIni] = horainicio.split(':').map(Number);
  const [hFim, mFim] = horafim.split(':').map(Number);
  const durMin = (hFim * 60 + mFim) - (hIni * 60 + mIni);
  if (durMin <= 0) throw new Error('Hora de fim deve ser posterior à hora de início');

  const existeConflito = await existeConflitoSalaOcupacao({
    salaId,
    data,
    inicioHora: `${horainicio}:00`,
    inicioMin: hIni * 60 + mIni,
    durMin,
  });
  if (existeConflito) {
    throw new Error('Este estúdio já tem uma ocupação neste horário.');
  }

  const sala = await prisma.sala.findUnique({
    where: { idsala: parseInt(salaId) },
  });
  if (!sala) throw new Error('Sala não encontrada');

  const result = await prisma.$queryRawUnsafe(`
    INSERT INTO salaocupacao (
      salaidsala,
      data,
      horainicio,
      horafim,
      tipo_ocupacao,
      responsavel,
      observacoes,
      direcaoutilizadoriduser,
      datacriacao
    ) VALUES (
      $1,
      $2::date,
      $3::time,
      $4::time,
      $5,
      $6,
      $7,
      $8,
      NOW()
    )
    RETURNING idsalaocupacao, salaidsala, data, horainicio, horafim, tipo_ocupacao, responsavel, observacoes, datacriacao
  `, parseInt(salaId), data, `${horainicio}:00`, `${horafim}:00`, tipo || null, responsavel || null, observacoes || null, parseInt(userId));

  const ocupacao = result[0];
  if (!ocupacao) throw new Error('Erro ao criar ocupação');

  return {
    id: String(ocupacao.idsalaocupacao),
    salaId: String(ocupacao.salaidsala),
    data: ocupacao.data ? new Date(ocupacao.data).toISOString().split('T')[0] : data,
    horainicio,
    horafim,
    duracao: durMin,
    tipo: ocupacao.tipo_ocupacao || tipo || 'Outro',
    responsavel: ocupacao.responsavel || responsavel || '',
    observacoes: ocupacao.observacoes || observacoes || '',
    status: 'CONFIRMADO',
  };
};

export const atualizarOcupacaoSala = async (id, { salaId, data, horainicio, horafim, tipo, responsavel, observacoes }, userId) => {
  const [hIni, mIni] = horainicio.split(':').map(Number);
  const [hFim, mFim] = horafim.split(':').map(Number);
  const durMin = (hFim * 60 + mFim) - (hIni * 60 + mIni);
  if (durMin <= 0) throw new Error('A hora de fim deve ser posterior à hora de início');

  const ocupacaoExistente = await prisma.$queryRawUnsafe(`
    SELECT idsalaocupacao
    FROM salaocupacao
    WHERE idsalaocupacao = $1
  `, parseInt(id));
  if (!ocupacaoExistente || ocupacaoExistente.length === 0) {
    throw new Error('Ocupação não encontrada');
  }

  const existeConflito = await existeConflitoSalaOcupacao({
    salaId,
    data,
    inicioHora: `${horainicio}:00`,
    inicioMin: hIni * 60 + mIni,
    durMin,
    excluirOcupacaoId: id,
  });
  if (existeConflito) {
    throw new Error('Este estúdio já tem uma ocupação neste horário.');
  }

  const result = await prisma.$queryRawUnsafe(`
    UPDATE salaocupacao SET
      salaidsala = $1,
      data = $2::date,
      horainicio = $3::time,
      horafim = $4::time,
      tipo_ocupacao = $5,
      responsavel = $6,
      observacoes = $7,
      direcaoutilizadoriduser = $8
    WHERE idsalaocupacao = $9
    RETURNING idsalaocupacao, salaidsala, data, horainicio, horafim, tipo_ocupacao, responsavel, observacoes, datacriacao
  `, parseInt(salaId), data, `${horainicio}:00`, `${horafim}:00`,
     tipo || null, responsavel || null, observacoes || null, parseInt(userId), parseInt(id));

  const ocupacao = result[0];
  if (!ocupacao) throw new Error('Ocupação não encontrada');

  return {
    id: String(ocupacao.idsalaocupacao),
    salaId: String(ocupacao.salaidsala),
    data: ocupacao.data ? new Date(ocupacao.data).toISOString().split('T')[0] : data,
    horainicio,
    horafim,
    duracao: durMin,
    tipo: ocupacao.tipo_ocupacao || tipo || 'Outro',
    responsavel: ocupacao.responsavel || responsavel || '',
    observacoes: ocupacao.observacoes || observacoes || '',
    status: 'CONFIRMADO',
  };
};

export const cancelarOcupacaoSala = async (id) => {
  const result = await prisma.$queryRawUnsafe(`
    DELETE FROM salaocupacao
    WHERE idsalaocupacao = $1
    RETURNING idsalaocupacao
  `, parseInt(id));

  if (!result || result.length === 0) {
    throw new Error('Ocupação não encontrada');
  }

  return { id: String(result[0].idsalaocupacao) };
};
