import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statusMap = {
  'PENDENTE': 'PENDENTE',
  'CONFIRMADO': 'CONFIRMADA',
  'APROVADO': 'APROVADA',
  'REJEITADO': 'REJEITADA',
  'REALIZADO': 'REALIZADA',
  'CANCELADO': 'CANCELADA',
  'CONCLUÍDO': 'CONCLUÍDA',
};
const normalize = (s) => statusMap[s.toUpperCase()] || s.toUpperCase();

export const getAlunoAulas = async (userId) => {
  const aulas = await prisma.$queryRaw`
    SELECT
      pa.idpedidoaula,
      pa.data,
      pa.horainicio,
      pa.duracaoaula,
      pa.estadoidestado,
      e.tipoestado as estado_nome,
      s.nomesala as sala_nome,
      s.idsala as sala_id,
      m.nome as modalidade_nome,
      COALESCE(u.nome, uprof.nome) as professor_nome,
      COALESCE(u.iduser, uprof.iduser) as professor_id,
      pa.alunoutilizadoriduser as aluno_id
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    LEFT JOIN sala s ON pa.salaidsala = s.idsala
    LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador u ON dm.professorutilizadoriduser = u.iduser
    LEFT JOIN utilizador uprof ON pa.professorutilizadoriduser = uprof.iduser
    WHERE (
      pa.alunoutilizadoriduser = ${userId}
      OR (
        pa.alunoutilizadoriduser IS NULL
        AND pa.encarregadoeducacaoutilizadoriduser = (
          SELECT a.encarregadoiduser FROM aluno a WHERE a.utilizadoriduser = ${userId} LIMIT 1
        )
      )
      OR pa.idpedidoaula IN (
        SELECT apa.pedidodeaulaidpedidoaula
        FROM alunopedidoaula apa
        JOIN aluno a ON apa.alunoidaluno = a.idaluno
        WHERE a.utilizadoriduser = ${userId}
      )
    )
    ORDER BY pa.data DESC, pa.horainicio DESC
  `;

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
      alunoId: String(a.aluno_id || userId),
    };
  });
};

export const getAllDisponibilidadesMensais = async () => {
  return await prisma.$queryRaw`
    SELECT 
      dm.iddisponibilidade_mensal,
      dm.professorutilizadoriduser,
      dm.data,
      dm.horainicio,
      dm.horafim,
      dm.minutos_ocupados,
      mp.idmodalidadeprofessor,
      m.nome as modalidades_nome,
      u.nome as professor_nome
    FROM disponibilidade_mensal dm
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador u ON dm.professorutilizadoriduser = u.iduser
    WHERE dm.ativo = true
    AND (dm.data IS NULL OR dm.data >= CURRENT_DATE)
    ORDER BY dm.data, dm.horainicio
  `;
};

// Helpers para cálculo de intervalos livres
const parseMin = (t) => {
  if (!t) return 0;
  const s = t instanceof Date ? t.toISOString().substring(11, 16) : String(t).substring(0, 5);
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};

const durToMin = (dur) => {
  if (!dur) return 0;
  if (dur instanceof Date) return dur.getUTCHours() * 60 + dur.getUTCMinutes();
  const parts = String(dur).split(':');
  return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
};

const minToTime = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const buscarIntervalosLivres = async (slotIds) => {
  if (!slotIds || slotIds.length === 0) return {};

  const bookings = await prisma.pedidodeaula.findMany({
    where: {
      disponibilidade_mensal_id: { in: slotIds },
    },
    include: { estado: true },
  });

  const ativos = bookings.filter(b => {
    const e = (b.estado?.tipoestado || '').toLowerCase();
    return e === 'pendente' || e === 'confirmado';
  });

  const agrupados = {};
  for (const b of ativos) {
    const sid = b.disponibilidade_mensal_id;
    if (!agrupados[sid]) agrupados[sid] = [];
    agrupados[sid].push(b);
  }

  const resultado = {};
  for (const sid of slotIds) {
    const bks = agrupados[sid] || [];
    resultado[sid] = { bookings: bks.map(b => ({
      horainicio: b.horainicio,
      duracaoaula: b.duracaoaula,
    })) };
  }

  return resultado;
};

export const calcularIntervalosSlot = (minInicio, minFim, bookingsData) => {
  const ocupados = (bookingsData || [])
    .filter(b => b.horainicio && b.duracaoaula)
    .map(b => ({ start: parseMin(b.horainicio), end: parseMin(b.horainicio) + durToMin(b.duracaoaula) }))
    .sort((a, b) => a.start - b.start);

  const livres = [];
  let current = minInicio;

  for (const occ of ocupados) {
    if (occ.start > current) {
      livres.push({ inicio: minToTime(current), fim: minToTime(occ.start), minutos: occ.start - current });
    }
    current = Math.max(current, occ.end);
  }
  if (current < minFim) {
    livres.push({ inicio: minToTime(current), fim: minToTime(minFim), minutos: minFim - current });
  }

  return {
    intervalosLivres: livres,
    maxDuracao: livres.length > 0 ? Math.max(...livres.map(i => i.minutos)) : 0,
  };
};