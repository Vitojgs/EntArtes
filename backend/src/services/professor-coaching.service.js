import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getProfessorAulas = async (professorId) => {
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
      pa.maxparticipantes,
      s.nomesala as sala_nome,
      s.idsala as sala_id,
      mp.modalidadeidmodalidade,
      m.nome as modalidade_nome,
      dm.professorutilizadoriduser as dm_professor_id,
      COALESCE(dm.professorutilizadoriduser, pa.professorutilizadoriduser) as professor_id,
      u.nome as professor_nome,
      alu.nome as aluno_nome,
      enc.nome as encarregado_nome,
      pa.encarregadoeducacaoutilizadoriduser as encarregado_id
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    LEFT JOIN sala s ON pa.salaidsala = s.idsala
    LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador alu ON pa.alunoutilizadoriduser = alu.iduser
    LEFT JOIN utilizador u ON COALESCE(dm.professorutilizadoriduser, pa.professorutilizadoriduser) = u.iduser
    LEFT JOIN utilizador enc ON pa.encarregadoeducacaoutilizadoriduser = enc.iduser
    WHERE (dm.professorutilizadoriduser = ${professorId} OR pa.disponibilidade_mensal_id IS NULL)
    AND LOWER(e.tipoestado) IN ('confirmado', 'realizado', 'pendente')
    ORDER BY pa.data DESC, pa.horainicio DESC
  `;

  const pedidoIds = aulas.map(a => a.idpedidoaula);
  const participantesMap = await getParticipantesPorPedidos(pedidoIds);

  return aulas.map(a => {
    const hora = a.horainicio;
    const horaFmt = hora instanceof Date 
      ? hora.toISOString().substring(11, 16) 
      : String(hora).substring(0, 5);
      
return {
      id: String(a.idpedidoaula),
      data: a.data ? new Date(a.data).toISOString().split('T')[0] : '',
      horaInicio: horaFmt,
      duracao: a.duracaoaula ? parseInt(String(a.duracaoaula).split(':')[0]) : 60,
      status: (a.estado_nome || '').toUpperCase(),
      modalidade: a.modalidade_nome || '',
      estudioId: String(a.sala_id || ''),
      estudioNome: a.sala_nome || '',
      professorId: String(a.professor_id || ''),
      professorNome: a.professor_nome || '',
      alunoNome: a.aluno_nome || '',
      maxParticipantes: a.maxparticipantes || 0,
      participantes: participantesMap[a.idpedidoaula] || [],
      encarregadoId: String(a.encarregado_id || ''),
      encarregadoNome: a.encarregado_nome || '',
      privacidade: a.privacidade || false,
      sugestaoestado: a.sugestaoestado || null,
      novadata: a.novadata ? new Date(a.novadata).toISOString().split('T')[0] : null,
      novaData: a.novadata ? new Date(a.novadata).toISOString().split('T')[0] : null
    };
  });
};

export const updateAulaStatus = async (id, newStatus) => {
  const estado = await prisma.$queryRaw`
    SELECT idestado FROM estado WHERE tipoestado = ${newStatus}
  `;

  if (!estado || estado.length === 0) {
    throw new Error(`Estado ${newStatus} não encontrado`);
  }

  return await prisma.$queryRaw`
    UPDATE pedidodeaula
    SET estadoidestado = ${estado[0].idestado}
    WHERE idpedidoaula = ${parseInt(id)}
    RETURNING idpedidoaula, data, horainicio, duracaoaula, estadoidestado
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
}