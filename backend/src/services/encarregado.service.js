import prisma from "../config/db.js";
import { createAuditLog } from "./audit.service.js";
import { createNotificacao } from "./notificacoes.service.js";
import { recalcularMinutosOcupados } from "../utils/disponibilidadeOcupacao.js";
import { buildNotification } from "../utils/notificationTemplates.js";

export const getEncarregadoAulas = async (encarregadoUserId) => {
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
      pa.sugestaoestado,
      pa.novadata,
      pa.motivorejeicao,
      s.nomesala as sala_nome,
      s.idsala as sala_id,
      m.nome as modalidade_nome,
      COALESCE(u.nome, uprof.nome) as professor_nome,
      COALESCE(u.iduser, uprof.iduser) as professor_id,
      alu.nome as aluno_nome,
      alu.iduser as aluno_id
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    LEFT JOIN sala s ON pa.salaidsala = s.idsala
    LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador u ON dm.professorutilizadoriduser = u.iduser
    LEFT JOIN utilizador uprof ON pa.professorutilizadoriduser = uprof.iduser
    LEFT JOIN utilizador alu ON pa.alunoutilizadoriduser = alu.iduser
    WHERE pa.encarregadoeducacaoutilizadoriduser = ${encarregadoUserId}
       OR pa.idpedidoaula IN (
          SELECT apa.pedidodeaulaidpedidoaula
          FROM alunopedidoaula apa
          JOIN aluno a ON apa.alunoidaluno = a.idaluno
          WHERE a.encarregadoiduser = ${encarregadoUserId}
       )
    ORDER BY pa.data DESC, pa.horainicio DESC
  `;

  const pedidoIds = aulas.map((a) => a.idpedidoaula);
  const participantesRows = pedidoIds.length > 0 ? await prisma.$queryRaw`
    SELECT apa.pedidodeaulaidpedidoaula, u.iduser, u.nome
    FROM alunopedidoaula apa
    JOIN aluno a ON apa.alunoidaluno = a.idaluno
    JOIN utilizador u ON a.utilizadoriduser = u.iduser
    WHERE apa.pedidodeaulaidpedidoaula = ANY(${pedidoIds})
  ` : [];
  const participantesPorPedido = {};
  for (const row of participantesRows) {
    const pid = row.pedidodeaulaidpedidoaula;
    if (!participantesPorPedido[pid]) participantesPorPedido[pid] = [];
    participantesPorPedido[pid].push({
      alunoId: String(row.iduser),
      alunoNome: row.nome,
    });
  }

  const statusMap = {
    'PENDENTE': 'PENDENTE',
    'CONFIRMADO': 'CONFIRMADA',
    'APROVADO': 'APROVADA',
    'REJEITADO': 'REJEITADA',
    'REALIZADO': 'REALIZADA',
    'CANCELADO': 'CANCELADA',
    'CONCLUÍDO': 'REALIZADA',
  };
  const normalize = (s) => statusMap[s.toUpperCase()] || s.toUpperCase();

  return aulas.map(a => {
    const horaInicio = a.horainicio instanceof Date
      ? a.horainicio.toISOString().substring(11, 16)
      : (a.horainicio ? String(a.horainicio).substring(0, 5) : '');
    const duracao = (() => {
      if (!a.duracaoaula) return 60;
      if (a.duracaoaula instanceof Date) return a.duracaoaula.getUTCHours() * 60 + a.duracaoaula.getUTCMinutes();
      const [h, m] = String(a.duracaoaula).split(':');
      return parseInt(h) * 60 + parseInt(m || '0');
    })();
    const [hH, hM] = horaInicio.split(':').map(Number);
    const endMin = hH * 60 + (hM || 0) + duracao;
    const horaFim = String(Math.floor(endMin / 60)).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');
    return {
      id: String(a.idpedidoaula),
      data: a.data ? new Date(a.data).toISOString().split('T')[0] : '',
      horaInicio,
      horaFim,
      duracao,
      status: normalize(a.estado_nome || ''),
      modalidade: a.modalidade_nome || '',
      estudioId: String(a.sala_id || ''),
      estudioNome: a.sala_nome || '',
      professorId: String(a.professor_id || ''),
      professorNome: a.professor_nome || '',
      alunoId: String(a.aluno_id || ''),
      alunoNome: a.aluno_nome || '',
      privacidade: a.privacidade || false,
      maxParticipantes: a.maxparticipantes || 0,
      participantes: participantesPorPedido[a.idpedidoaula] || [],
      sugestaoestado: a.sugestaoestado || null,
      novadata: a.novadata ? new Date(a.novadata).toISOString().split('T')[0] : null,
      novaData: a.novadata ? new Date(a.novadata).toISOString().split('T')[0] : null,
      motivoRejeicao: a.motivorejeicao || null,
    };
  });
};

export const getGruposAbertos = async () => {
  const statusMap = {
    'PENDENTE': 'PENDENTE',
    'CONFIRMADO': 'CONFIRMADA',
    'APROVADO': 'APROVADA',
    'REJEITADO': 'REJEITADA',
    'REALIZADO': 'REALIZADA',
    'CANCELADO': 'CANCELADA',
    'CONCLUÍDO': 'REALIZADA',
  };
  const normalize = (s) => statusMap[s.toUpperCase()] || s.toUpperCase();

  const grupos = await prisma.$queryRaw`
    SELECT
      pa.idpedidoaula,
      pa.data,
      pa.horainicio,
      pa.duracaoaula,
      pa.maxparticipantes,
      pa.privacidade,
      s.nomesala as sala_nome,
      s.idsala as sala_id,
      mp.modalidadeidmodalidade,
      m.nome as modalidade_nome,
      u.nome as professor_nome,
      u.iduser as professor_id,
      e.tipoestado as estado_nome,
      pa.estadoidestado
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    LEFT JOIN sala s ON pa.salaidsala = s.idsala
    LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador u ON dm.professorutilizadoriduser = u.iduser
    WHERE pa.privacidade = false
    AND pa.grupoidgrupo IS NOT NULL
    AND LOWER(e.tipoestado) IN ('pendente', 'confirmado', 'aprovado')
    ORDER BY pa.data DESC, pa.horainicio DESC
  `;
  const pedidoIds = grupos.map((g) => g.idpedidoaula);
  const participantesRows = pedidoIds.length > 0 ? await prisma.$queryRaw`
    SELECT apa.pedidodeaulaidpedidoaula, u.iduser, u.nome
    FROM alunopedidoaula apa
    JOIN aluno a ON apa.alunoidaluno = a.idaluno
    JOIN utilizador u ON a.utilizadoriduser = u.iduser
    WHERE apa.pedidodeaulaidpedidoaula = ANY(${pedidoIds})
  ` : [];
  const participantesPorPedido = {};
  for (const row of participantesRows) {
    const pid = row.pedidodeaulaidpedidoaula;
    if (!participantesPorPedido[pid]) participantesPorPedido[pid] = [];
    participantesPorPedido[pid].push({
      alunoId: String(row.iduser),
      alunoNome: row.nome,
    });
  }
  return grupos.map((g) => {
    const horaInicio = g.horainicio instanceof Date
      ? g.horainicio.toISOString().substring(11, 16)
      : (g.horainicio ? String(g.horainicio).substring(0, 5) : '');
    const duracao = (() => {
      if (!g.duracaoaula) return 60;
      if (g.duracaoaula instanceof Date) return g.duracaoaula.getUTCHours() * 60 + g.duracaoaula.getUTCMinutes();
      const [h, m] = String(g.duracaoaula).split(':');
      return parseInt(h) * 60 + parseInt(m || '0');
    })();
    const [hH, hM] = horaInicio.split(':').map(Number);
    const endMin = hH * 60 + (hM || 0) + duracao;
    const horaFim = String(Math.floor(endMin / 60)).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');
    return {
      id: String(g.idpedidoaula),
      data: g.data ? new Date(g.data).toISOString().split('T')[0] : '',
      horaInicio,
      horaFim,
      duracao,
      maxParticipantes: g.maxparticipantes || 10,
      participantes: participantesPorPedido[g.idpedidoaula] || [],
      privacidade: g.privacidade || false,
      estudioId: String(g.sala_id || ''),
      estudioNome: g.sala_nome || '',
      modalidade: g.modalidade_nome || '',
      professorId: String(g.professor_id || ''),
      professorNome: g.professor_nome || '',
      status: normalize(g.estado_nome || '')
    };
  });
};

export const getJoinableCoachings = async (encarregadoUserId) => {
  const coachings = await prisma.$queryRaw`
    SELECT
      pa.idpedidoaula,
      pa.data,
      pa.horainicio,
      pa.duracaoaula,
      pa.maxparticipantes,
      pa.privacidade,
      pa.sugestaoestado,
      pa.novadata,
      pa.encarregadoeducacaoutilizadoriduser,
      pa.alunoutilizadoriduser,
      e.tipoestado as estado_nome,
      s.nomesala as sala_nome,
      s.idsala as sala_id,
      m.nome as modalidade_nome,
      u.nome as professor_nome,
      u.iduser as professor_id
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    LEFT JOIN sala s ON pa.salaidsala = s.idsala
    LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador u ON dm.professorutilizadoriduser = u.iduser
    WHERE pa.privacidade = false
    AND pa.grupoidgrupo IS NULL
    AND pa.maxparticipantes > 1
    AND pa.encarregadoeducacaoutilizadoriduser != ${parseInt(encarregadoUserId)}
    AND LOWER(e.tipoestado) IN ('pendente', 'confirmado', 'aprovado')
    ORDER BY pa.data DESC, pa.horainicio DESC
  `;

  const pedidoIds = coachings.map((c) => c.idpedidoaula);
  const participantesRows = pedidoIds.length > 0 ? await prisma.$queryRaw`
    SELECT apa.pedidodeaulaidpedidoaula, u.iduser, u.nome
    FROM alunopedidoaula apa
    JOIN aluno a ON apa.alunoidaluno = a.idaluno
    JOIN utilizador u ON a.utilizadoriduser = u.iduser
    WHERE apa.pedidodeaulaidpedidoaula = ANY(${pedidoIds})
  ` : [];
  const participantesPorPedido = {};
  for (const row of participantesRows) {
    const pid = row.pedidodeaulaidpedidoaula;
    if (!participantesPorPedido[pid]) participantesPorPedido[pid] = [];
    participantesPorPedido[pid].push({
      alunoId: String(row.iduser),
      alunoNome: row.nome,
    });
  }

  const statusMap = {
    'PENDENTE': 'PENDENTE',
    'CONFIRMADO': 'CONFIRMADA',
    'APROVADO': 'APROVADA',
    'REJEITADO': 'REJEITADA',
    'REALIZADO': 'REALIZADA',
    'CANCELADO': 'CANCELADA',
    'CONCLUÍDO': 'REALIZADA',
  };
  const normalize = (s) => statusMap[s.toUpperCase()] || s.toUpperCase();

  return coachings.map(c => {
    const horaInicio = c.horainicio instanceof Date
      ? c.horainicio.toISOString().substring(11, 16)
      : (c.horainicio ? String(c.horainicio).substring(0, 5) : '');
    const duracao = (() => {
      if (!c.duracaoaula) return 60;
      if (c.duracaoaula instanceof Date) return c.duracaoaula.getUTCHours() * 60 + c.duracaoaula.getUTCMinutes();
      const [h, m] = String(c.duracaoaula).split(':');
      return parseInt(h) * 60 + parseInt(m || '0');
    })();
    const [hH, hM] = horaInicio.split(':').map(Number);
    const endMin = hH * 60 + (hM || 0) + duracao;
    const horaFim = String(Math.floor(endMin / 60)).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');
    return {
      id: String(c.idpedidoaula),
      alunoId: c.alunoutilizadoriduser ? String(c.alunoutilizadoriduser) : '',
      alunoNome: '',
      encarregadoId: String(c.encarregadoeducacaoutilizadoriduser || ''),
      data: c.data ? new Date(c.data).toISOString().split('T')[0] : '',
      horaInicio,
      horaFim,
      duracao,
      maxParticipantes: c.maxparticipantes || 1,
      participantes: participantesPorPedido[c.idpedidoaula] || [],
      privacidade: c.privacidade || false,
      estudioId: String(c.sala_id || ''),
      estudioNome: c.sala_nome || '',
      modalidade: c.modalidade_nome || '',
      professorId: String(c.professor_id || ''),
      professorNome: c.professor_nome || '',
      status: normalize(c.estado_nome || '')
    };
  });
};

export const submeterPedidoAula = async (data, incarregadoUserId) => {
  const {
    data: dataAula,
    horainicio,
    duracaoaula,
    maxparticipantes,
    disponibilidade_mensal_id,
    professor_utilizador_id,
    alunoutilizadoriduser,
    salaidsala,
    privacidade,
    grupoidgrupo
  } = data;

  const estadoPendente = await prisma.$queryRaw`
    SELECT idestado FROM estado WHERE LOWER(tipoestado) = 'pendente'
  `;

  if (!estadoPendente || estadoPendente.length === 0) {
    throw new Error('Estado PENDENTE não encontrado');
  }
  
  const agora = new Date();
  const dataInput = new Date(dataAula);
  const dataHojeStr = agora.toISOString().split('T')[0];
  const dataInputStr = dataInput.toISOString().split('T')[0];
  
  if (dataInputStr < dataHojeStr) {
    throw new Error('A data não pode ser no passado');
  }
  
  if (dataInputStr === dataHojeStr && horainicio) {
    const [horaH, horaM] = (horainicio || '00:00').split(':').map(Number);
    const horaInputMinutos = horaH * 60 + horaM;
    const horaAtualMinutos = agora.getHours() * 60 + agora.getMinutes();
    if (horaInputMinutos <= horaAtualMinutos) {
      throw new Error('A hora de início deve ser posterior à hora atual');
    }
  }

  const dataStr = new Date(dataAula).toISOString().split('T')[0];
  const horaStr = horainicio || '09:00';
  const duracaoStr = String(duracaoaula || 60);
  const slotId = disponibilidade_mensal_id ? parseInt(disponibilidade_mensal_id) : null;
  const profId = professor_utilizador_id ? parseInt(professor_utilizador_id) : null;
  const aluId = alunoutilizadoriduser ? parseInt(alunoutilizadoriduser) : null;

  let finalSlotId = slotId;
  if (!finalSlotId && profId && dataAula && horainicio) {
    const slotLookup = await prisma.$queryRaw`
      SELECT iddisponibilidade_mensal FROM disponibilidade_mensal
      WHERE professorutilizadoriduser = ${profId}
      AND data = ${dataStr}::date
      LIMIT 1
    `;
    if (slotLookup && slotLookup.length > 0) {
      finalSlotId = slotLookup[0].iddisponibilidade_mensal;
    }
  }

  // Resolve the professor ID: from slot lookup or directly from body
  let finalProfId = profId;
  if (!finalProfId && finalSlotId) {
    const slotData = await prisma.$queryRaw`
      SELECT professorutilizadoriduser FROM disponibilidade_mensal
      WHERE iddisponibilidade_mensal = ${finalSlotId} LIMIT 1
    `;
    if (slotData?.length > 0) finalProfId = Number(slotData[0].professorutilizadoriduser);
  }

  // Validate the requested hour is within the slot boundaries
  if (finalSlotId && horainicio && duracaoaula) {
    const slotBounds = await prisma.$queryRaw`
      SELECT horainicio, horafim FROM disponibilidade_mensal
      WHERE iddisponibilidade_mensal = ${finalSlotId} LIMIT 1
    `;
    if (slotBounds?.length > 0) {
      const parseMin = (t) => {
        if (!t) return 0;
        const s = t instanceof Date ? t.toISOString().substring(11, 16) : String(t).substring(0, 5);
        const [h, m] = s.split(':').map(Number);
        return h * 60 + (m || 0);
      };
      const requestMin = parseMin(horainicio);
      const slotInicioMin = parseMin(slotBounds[0].horainicio);
      const slotFimMin = parseMin(slotBounds[0].horafim);
      const duracaoMin = parseInt(duracaoaula) || 0;
      if (requestMin < slotInicioMin) {
        throw new Error(`A hora de início (${horainicio}) é antes do início da disponibilidade (${String(slotBounds[0].horainicio).substring(0, 5)})`);
      }
      if (requestMin >= slotFimMin) {
        throw new Error(`A hora de início (${horainicio}) é após o fim da disponibilidade (${String(slotBounds[0].horafim).substring(0, 5)})`);
      }
      if (requestMin + duracaoMin > slotFimMin) {
        const fimPrevisto = `${String(Math.floor((requestMin + duracaoMin) / 60)).padStart(2, '0')}:${String((requestMin + duracaoMin) % 60).padStart(2, '0')}`;
        const slotFimStr = String(slotBounds[0].horafim).substring(0, 5);
        throw new Error(`O término previsto (${fimPrevisto}) ultrapassa o limite (${slotFimStr}).`);
      }
    }
  }

  // Conflict check: reject if the slot already has a PENDING/CONFIRMED booking that overlaps
  if (finalSlotId && horainicio && duracaoaula) {
    const duracaoMin = parseInt(duracaoaula) || 60;
    const conflito = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total
      FROM pedidodeaula pa
      JOIN estado e ON pa.estadoidestado = e.idestado
      WHERE pa.disponibilidade_mensal_id = $1
      AND LOWER(e.tipoestado) IN ('pendente', 'confirmado', 'aprovado')
      AND $2::time < (pa.horainicio + pa.duracaoaula::text::interval)
      AND ($2::time + $3 * INTERVAL '1 minute') > pa.horainicio
    `, finalSlotId, horaStr, duracaoMin);
    if (parseInt(conflito[0]?.total) > 0) {
      throw new Error('Este horário já está reservado. Escolha outro horário disponível.');
    }
  }

  // P-02: Sala conflict check — reject if the same sala has an overlapping booking
  if (salaidsala && horainicio && dataAula && duracaoaula) {
    const duracaoMin = parseInt(duracaoaula) || 60;
    const salaConflito = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total
      FROM pedidodeaula pa
      JOIN estado e ON pa.estadoidestado = e.idestado
      WHERE pa.salaidsala = $1
      AND pa.data = $2::date
      AND LOWER(e.tipoestado) IN ('pendente', 'confirmado', 'aprovado')
      AND $3::time < (pa.horainicio + pa.duracaoaula::text::interval)
      AND ($3::time + $4 * INTERVAL '1 minute') > pa.horainicio
    `, parseInt(salaidsala), dataStr, horaStr, duracaoMin);
    if (parseInt(salaConflito[0]?.total) > 0) {
      throw new Error('Esta sala já está reservada para outro pedido neste horário.');
    }
  }

  // Student conflict check — reject if the same aluno already has a booking at this time with another professor
  if (aluId && horainicio && dataAula && duracaoaula) {
    const duracaoMin = parseInt(duracaoaula) || 60;
    const alunoConflito = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total
      FROM pedidodeaula pa
      JOIN estado e ON pa.estadoidestado = e.idestado
      WHERE pa.alunoutilizadoriduser = $1
      AND pa.data = $2::date
      AND LOWER(e.tipoestado) IN ('pendente', 'confirmado', 'aprovado')
      AND $3::time < (pa.horainicio + pa.duracaoaula::text::interval)
      AND ($3::time + $4 * INTERVAL '1 minute') > pa.horainicio
    `, aluId, dataStr, horaStr, duracaoMin);
    if (parseInt(alunoConflito[0]?.total) > 0) {
      throw new Error('Este aluno já tem um coaching marcado neste horário.');
    }
  }

  // Professor conflict check — reject if the same professor already has another booking at this time
  if (finalProfId && horainicio && dataAula && duracaoaula) {
    const duracaoMin = parseInt(duracaoaula) || 60;
    const profConflito = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total
      FROM pedidodeaula pa
      JOIN estado e ON pa.estadoidestado = e.idestado
      LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
      WHERE (dm.professorutilizadoriduser = $1 OR pa.professorutilizadoriduser = $1)
      AND pa.data = $2::date
      AND LOWER(e.tipoestado) IN ('pendente', 'confirmado', 'aprovado')
      AND $3::time < (pa.horainicio + pa.duracaoaula::text::interval)
      AND ($3::time + $4 * INTERVAL '1 minute') > pa.horainicio
    `, finalProfId, dataStr, horaStr, duracaoMin);
    if (parseInt(profConflito[0]?.total) > 0) {
      throw new Error('Este professor já tem um coaching marcado neste horário.');
    }
  }

  const grupoId = data.grupoidgrupo ? parseInt(data.grupoidgrupo) : null;

  const result = await prisma.$queryRawUnsafe(`
    INSERT INTO pedidodeaula
    (data, horainicio, duracaoaula, maxparticipantes, datapedido, privacidade,
     disponibilidade_mensal_id, professorutilizadoriduser, alunoutilizadoriduser,
     grupoidgrupo, estadoidestado, salaidsala, encarregadoeducacaoutilizadoriduser)
    VALUES (
      $1::date,
      $2::time,
      $3::interval,
      ${maxparticipantes || 1},
      NOW(),
      $4,
      $5,
      $10,
      $9,
      $11,
      $6,
      $7,
      $8
    )
    RETURNING idpedidoaula, data, horainicio, duracaoaula, privacidade
  `, dataStr, horaStr, duracaoStr + ' minutes', privacidade || false, finalSlotId, estadoPendente[0].idestado, parseInt(salaidsala), incarregadoUserId, aluId, finalProfId, grupoId);

  const pedidoId = result?.[0]?.idpedidoaula;
  if (pedidoId) {
    await createAuditLog(parseInt(incarregadoUserId), '', 'CREATE', 'PedidoAula', pedidoId, `Pedido criado para ${dataStr}`);
  }

  await recalcularMinutosOcupados(prisma, finalSlotId);

  return result;
};

export const marcarAula = async (pedidoId, alunoUserId, encarregadoUserId) => {
  const pedidos = await prisma.$queryRaw`
    SELECT pa.idpedidoaula, pa.maxparticipantes, pa.privacidade,
           pa.encarregadoeducacaoutilizadoriduser, pa.alunoutilizadoriduser, e.tipoestado
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    WHERE pa.idpedidoaula = ${pedidoId}
  `;
  if (!pedidos || pedidos.length === 0) throw new Error("Pedido não encontrado");
  const p = pedidos[0];
  if (!p.tipoestado || !['PENDENTE', 'CONFIRMADO', 'APROVADO'].includes(p.tipoestado.toUpperCase())) {
    throw new Error("Só pode participar em aulas pendentes, confirmadas ou aprovadas");
  }

  // Private groups: only the owner EE can add alunos
  if (p.privacidade && p.encarregadoeducacaoutilizadoriduser !== parseInt(encarregadoUserId)) {
    throw new Error("Não tem permissão para participar nesta aula");
  }

  const maxVagas = p.maxparticipantes || 1;
  const countResult = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total FROM alunopedidoaula
    WHERE pedidodeaulaidpedidoaula = ${pedidoId}
  `;
  const ocupadas = countResult[0]?.total ?? 0;
  const mainOcupado = p.alunoutilizadoriduser != null ? 1 : 0;

  if (ocupadas + 1 + mainOcupado > maxVagas) {
    throw new Error("Aula lotada. Não há vagas disponíveis.");
  }

  // Convert utilizador.iduser → aluno.idaluno via subquery
  const jaInscrito = await prisma.$queryRaw`
    SELECT 1 FROM alunopedidoaula
    WHERE pedidodeaulaidpedidoaula = ${pedidoId}
    AND alunoidaluno = (SELECT idaluno FROM aluno WHERE utilizadoriduser = ${parseInt(alunoUserId)})
  `;
  if (jaInscrito && jaInscrito.length > 0) {
    throw new Error("Este aluno já está inscrito nesta aula");
  }

  await prisma.$queryRaw`
    INSERT INTO alunopedidoaula (alunoidaluno, pedidodeaulaidpedidoaula, datainscricao)
    VALUES (
      (SELECT idaluno FROM aluno WHERE utilizadoriduser = ${parseInt(alunoUserId)}),
      ${parseInt(pedidoId)},
      NOW()
    )
  `;

  const alunoInfo = await prisma.aluno.findFirst({
    where: { utilizadoriduser: parseInt(alunoUserId) },
    include: { utilizador: true }
  });
  const alunoNome = alunoInfo?.utilizador?.nome || `Aluno #${alunoUserId}`;

  const aulaInfo = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(pedidoId) },
    include: {
      encarregadoeducacao: { include: { utilizador: true } },
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } }
      }
    }
  });

  if (aulaInfo?.disponibilidade_mensal?.professor?.utilizadoriduser) {
    await createNotificacao(
      aulaInfo.disponibilidade_mensal.professor.utilizadoriduser,
      `📋 O aluno ${alunoNome} inscreveu-se na sua aula #${pedidoId}.`,
      'ALUNO_INSCRITO_AULA',
      parseInt(pedidoId), 'coaching'
    );
  }

  if (aulaInfo?.encarregadoeducacao?.utilizadoriduser
      && aulaInfo.encarregadoeducacao.utilizadoriduser !== parseInt(encarregadoUserId)) {
    await createNotificacao(
      aulaInfo.encarregadoeducacao.utilizadoriduser,
      `📋 O encarregado de educação inscreveu o aluno ${alunoNome} na sua aula partilhada #${pedidoId}.`,
      'ALUNO_INSCRITO_AULA',
      parseInt(pedidoId), 'coaching'
    );
  }

  await createAuditLog(
    parseInt(encarregadoUserId), '', 'UPDATE', 'PedidoAula', pedidoId,
    `Aluno (userId ${alunoUserId}) associado à aula #${pedidoId}`
  );

  return { success: true };
};

export const cancelarParticipacaoAula = async (pedidoId, encarregadoUserId) => {
  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(pedidoId) },
    include: { estado: true }
  });

  if (!pedido) {
    throw new Error("Pedido não encontrado");
  }

  const estadoNome = (pedido.estado.tipoestado || '').toUpperCase();
  if (estadoNome !== 'PENDENTE' && estadoNome !== 'CONFIRMADO') {
    throw new Error("Só pode cancelar participação em aulas pendentes ou confirmadas");
  }

  // Descobrir os alunos deste encarregado
  const meusAlunos = await prisma.aluno.findMany({
    where: { encarregadoiduser: parseInt(encarregadoUserId) }
  });
  const meusAlunoIds = meusAlunos.map(a => a.idaluno);
  const meusAlunoUserIds = meusAlunos.map(a => a.utilizadoriduser);

  if (meusAlunoIds.length === 0) {
    throw new Error("Não tem alunos associados a esta conta");
  }

  // Verificar se o EE tem alunos ligados a este pedido
  const mainAlunoIsMeu = pedido.alunoutilizadoriduser != null &&
    meusAlunoUserIds.includes(Number(pedido.alunoutilizadoriduser));

  const minhasInscricoes = await prisma.alunopedidoaula.findMany({
    where: {
      pedidodeaulaidpedidoaula: parseInt(pedidoId),
      alunoidaluno: { in: meusAlunoIds }
    }
  });

  if (!mainAlunoIsMeu && minhasInscricoes.length === 0) {
    throw new Error("Não tem permissão para cancelar participação neste pedido");
  }

  // Remover o main aluno se for deste EE
  if (mainAlunoIsMeu) {
    await prisma.pedidodeaula.update({
      where: { idpedidoaula: parseInt(pedidoId) },
      data: { alunoutilizadoriduser: null }
    });
  }

  // Remover os participantes deste EE
  if (minhasInscricoes.length > 0) {
    await prisma.alunopedidoaula.deleteMany({
      where: {
        pedidodeaulaidpedidoaula: parseInt(pedidoId),
        alunoidaluno: { in: meusAlunoIds }
      }
    });
  }

  await createAuditLog(parseInt(encarregadoUserId), '', 'CANCEL', 'PedidoAula', parseInt(pedidoId), 'Participação cancelada');

  // ── Verificar se ainda há alunos no pedido (main ou participantes) ─────
  const pedidoAtual = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(pedidoId) },
    select: { alunoutilizadoriduser: true }
  });
  const participantesRestantes = await prisma.alunopedidoaula.count({
    where: { pedidodeaulaidpedidoaula: parseInt(pedidoId) }
  });

  const temAlunos = pedidoAtual?.alunoutilizadoriduser != null || participantesRestantes > 0;

  if (!temAlunos) {
    // Nenhum aluno restante → cancelar pedido e libertar minutos_ocupados
    const estadoCancelado = await prisma.$queryRaw`
      SELECT idestado FROM estado WHERE LOWER(tipoestado) = 'cancelado' LIMIT 1
    `;
    if (estadoCancelado?.length) {
      await prisma.pedidodeaula.update({
        where: { idpedidoaula: parseInt(pedidoId) },
        data: {
          estadoidestado: estadoCancelado[0].idestado,
          salaidsala: null
        }
      });
    }

    await recalcularMinutosOcupados(prisma, pedido.disponibilidade_mensal_id);

    if (pedido.professorutilizadoriduser) {
      await createNotificacao(
        pedido.professorutilizadoriduser,
        `❌ Aula #${pedidoId} cancelada — sem alunos inscritos.`,
        'AULA_CANCELADA',
        parseInt(pedidoId), 'coaching'
      );
    }

    // Notificar direção
    const dataStr = pedido.data ? new Date(pedido.data).toLocaleDateString('pt-PT') : '';
    const horaStr = pedido.horainicio
      ? `${String(pedido.horainicio.getUTCHours()).padStart(2, '0')}:${String(pedido.horainicio.getUTCMinutes()).padStart(2, '0')}`
      : '';
    const direcao = await prisma.direcao.findFirst();
    if (direcao) {
      await createNotificacao(
        direcao.utilizadoriduser,
        `❌ Aula #${pedidoId} cancelada — todos os alunos removeram a inscrição. Data: ${dataStr} às ${horaStr}.`,
        'AULA_CANCELADA',
        parseInt(pedidoId), 'coaching'
      );
    }

    return { success: true, message: "Participação cancelada. Aula cancelada por falta de alunos." };
  }

  if (!pedidoAtual?.alunoutilizadoriduser) {
    // Ainda há participantes de outros EE mas sem aluno principal → voltar a PENDENTE
    const estadoPendente = await prisma.$queryRaw`
      SELECT idestado FROM estado WHERE LOWER(tipoestado) = 'pendente' LIMIT 1
    `;
    if (estadoPendente?.length) {
      await prisma.pedidodeaula.update({
        where: { idpedidoaula: parseInt(pedidoId) },
        data: { estadoidestado: estadoPendente[0].idestado }
      });
    }

    if (pedido.professorutilizadoriduser) {
      await createNotificacao(
        pedido.professorutilizadoriduser,
        `📋 Aula #${pedidoId} reaberta — precisa de novo encarregado principal.`,
        'AULA_REABERTA',
        parseInt(pedidoId), 'coaching'
      );
    }
  }

  return { success: true, message: "Participação cancelada com sucesso" };
};

export const inserirAlunoPedido = async (pedidoId, alunoId, encarregadoUserId) => {
  const pedido = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(pedidoId) }
  });

  if (!pedido) {
    throw new Error("Pedido não encontrado");
  }

  if (pedido.encarregadoeducacaoutilizadoriduser !== parseInt(encarregadoUserId)) {
    throw new Error("Não tem permissão para associar alunos a este pedido");
  }

  const estado = await prisma.estado.findFirst({
    where: { tipoestado: { equals: 'Pendente', mode: 'insensitive' } }
  });

  if (!estado || pedido.estadoidestado !== estado.idestado) {
    throw new Error("Só pode associar alunos a pedidos pendentes");
  }

  const existe = await prisma.alunopedidoaula.findFirst({
    where: {
      pedidodeaulaidpedidoaula: parseInt(pedidoId),
      alunoidaluno: parseInt(alunoId)
    }
  });

  if (existe) {
    throw new Error("Aluno já está associado a este pedido");
  }

  const associacao = await prisma.alunopedidoaula.create({
    data: {
      pedidodeaulaidpedidoaula: parseInt(pedidoId),
      alunoidaluno: parseInt(alunoId)
    }
  });

  const alu = await prisma.aluno.findUnique({
    where: { idaluno: parseInt(alunoId) },
    include: { utilizador: true }
  });

  const notificacao = buildNotification('alunoAssociadoPedido', { id: pedidoId });
  await createNotificacao(
    alu.utilizadoriduser,
    notificacao.mensagem,
    notificacao.tipo,
    parseInt(pedidoId),
    notificacao.referencia_tipo
  );

  const pedidoCompleto = await prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(pedidoId) },
    include: {
      disponibilidade_mensal: {
        include: { professor: { include: { utilizador: true } } }
      }
    }
  });

  const professorUserId = pedidoCompleto?.disponibilidade_mensal?.professor?.utilizadoriduser;
  if (professorUserId) {
    await createNotificacao(
      professorUserId,
      `📋 O aluno ${alu.utilizador?.nome || `#${alunoId}`} foi associado ao pedido de aula #${pedidoId}.`,
      'ALUNO_ASSOCIADO_PEDIDO',
      parseInt(pedidoId), 'coaching'
    );
  }

  return associacao;
};
