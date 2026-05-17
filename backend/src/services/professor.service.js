import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const verificarDisponibilidadeProfessor = async (professorId) => {
  return await prisma.$queryRaw`
    SELECT dm.*, mp.modalidadeidmodalidade, m.nome as modalidade_nome
    FROM disponibilidade_mensal dm
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    WHERE dm.professorutilizadoriduser = ${professorId}
    AND dm.ativo = true
    ORDER BY dm.data, dm.horainicio
  `;
};

export const createDisponibilidadeMensal = async (data) => {
  const { professorutilizadoriduser, modalidadesprofessoridmodalidadeprofessor, data: dataDisponibilidade, horainicio, horafim, salaid } = data;

  return await prisma.$queryRawUnsafe(`
    INSERT INTO disponibilidade_mensal
    (professorutilizadoriduser, modalidadesprofessoridmodalidadeprofessor, data, horainicio, horafim, ativo, salaid)
    VALUES ($1, $2, $3::date, $4::time, $5::time, true, $6)
    RETURNING *
  `, parseInt(professorutilizadoriduser), parseInt(modalidadesprofessoridmodalidadeprofessor),
     dataDisponibilidade, horainicio, horafim, salaid || null);
};

export const updateDisponibilidadeMensal = async (id, data) => {
  const { data: dataDisponibilidade, horainicio, horafim, ativo, salaid } = data;

  return await prisma.$queryRawUnsafe(`
    UPDATE disponibilidade_mensal
    SET data = $1::date, horainicio = $2::time, horafim = $3::time, ativo = $4, salaid = $5
    WHERE iddisponibilidade_mensal = $6
    RETURNING *
  `, dataDisponibilidade, horainicio, horafim, ativo ?? true, salaid || null, parseInt(id));
};

export const deleteDisponibilidadeMensal = async (id) => {
  return await prisma.$queryRaw`
    DELETE FROM disponibilidade_mensal
    WHERE iddisponibilidade_mensal = ${parseInt(id)}
    RETURNING *
  `;
};

export const getProfessorModalidades = async (professorId) => {
  return await prisma.$queryRaw`
    SELECT mp.idmodalidadeprofessor, m.idmodalidade, m.nome as modalidade_nome
    FROM modalidadeprofessor mp
    JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    WHERE mp.professorutilizadoriduser = ${professorId}
  `;
};

export const getProfessorAulas = async (professorId) => {
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

  const aulas = await prisma.$queryRaw`
    SELECT
      pa.idpedidoaula,
      pa.data,
      pa.horainicio,
      pa.duracaoaula,
      pa.estadoidestado,
      e.tipoestado as estado_nome,
      pa.privacidade,
      pa.sugestaoestado,
      pa.novadata,
      s.nomesala as sala_nome,
      mp.modalidadeidmodalidade,
      m.nome as modalidade_nome,
      alu.nome as aluno_nome,
      alu.iduser as aluno_id,
      COALESCE(dm.professorutilizadoriduser, pa.professorutilizadoriduser) as professor_id,
      u.nome as professor_nome
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    JOIN sala s ON pa.salaidsala = s.idsala
    LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador alu ON pa.alunoutilizadoriduser = alu.iduser
    LEFT JOIN utilizador u ON COALESCE(dm.professorutilizadoriduser, pa.professorutilizadoriduser) = u.iduser
    WHERE (dm.professorutilizadoriduser = ${professorId} OR pa.professorutilizadoriduser = ${professorId})
    AND (LOWER(e.tipoestado) IN ('confirmado', 'realizado') OR pa.sugestaoestado = 'AGUARDA_PROFESSOR')
    ORDER BY pa.data DESC, pa.horainicio DESC
  `;

  const pedidoIds = aulas.map(a => a.idpedidoaula);
  const participantesMap = await getParticipantesPorPedidos(pedidoIds);

  return aulas.map((a) => {
    const horaInicio = a.horainicio
      ? (a.horainicio instanceof Date ? a.horainicio.toISOString().substring(11, 16) : String(a.horainicio).substring(0, 5))
      : '';
    const duracao = (() => {
      if (!a.duracaoaula) return 60;
      if (a.duracaoaula instanceof Date) return a.duracaoaula.getUTCHours() * 60 + a.duracaoaula.getUTCMinutes();
      const [h, m] = String(a.duracaoaula).split(':');
      return parseInt(h) * 60 + parseInt(m || '0');
    })();
    const [hh, mm] = (horaInicio || '00:00').split(':').map(Number);
    const endMin = hh * 60 + mm + duracao;
    const horaFim = String(Math.floor(endMin / 60)).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');
    return {
      id: String(a.idpedidoaula),
      data: a.data ? new Date(a.data).toISOString().split('T')[0] : '',
      horaInicio,
      horaFim,
      duracao,
      status: normalize(a.estado_nome || ''),
      modalidade: a.modalidade_nome || '',
      estudioNome: a.sala_nome || '',
      professorId: String(a.professor_id || ''),
      professorNome: a.professor_nome || '',
      alunoId: String(a.aluno_id || ''),
      alunoNome: a.aluno_nome || '',
      participantes: participantesMap[a.idpedidoaula] || [],
      sugestaoestado: a.sugestaoestado || null,
      novadata: a.novadata ? new Date(a.novadata).toISOString().split('T')[0] : null,
      novaData: a.novadata ? new Date(a.novadata).toISOString().split('T')[0] : null,
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
      mp.idmodalidadeprofessor,
      m.nome as modalidade_nome,
      u.nome as professor_nome,
      dm.salaid,
      s.nomesala as estudio_nome,
      dm.minutos_ocupados,
      EXTRACT(EPOCH FROM (dm.horafim::time - dm.horainicio::time))/60 as total_minutos
    FROM disponibilidade_mensal dm
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador u ON dm.professorutilizadoriduser = u.iduser
    LEFT JOIN sala s ON dm.salaid = s.idsala
    WHERE dm.ativo = true
    ORDER BY dm.data, dm.horainicio
  `;
};

export const getDiasSemana = () => {
  return [
    { num: 1, label: "Segunda-feira", short: "Seg" },
    { num: 2, label: "Terça-feira", short: "Ter" },
    { num: 3, label: "Quarta-feira", short: "Qua" },
    { num: 4, label: "Quinta-feira", short: "Qui" },
    { num: 5, label: "Sexta-feira", short: "Sex" },
    { num: 6, label: "Sábado", short: "Sáb" },
  ];
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
}
