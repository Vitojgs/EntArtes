export function duracaoParaMinutos(durRaw) {
  if (!durRaw) return 60;
  if (durRaw instanceof Date) return durRaw.getUTCHours() * 60 + durRaw.getUTCMinutes();

  const parts = String(durRaw).split(':');
  const horas = parseInt(parts[0] || '0', 10);
  const minutos = parseInt(parts[1] || '0', 10);
  return horas * 60 + minutos;
}

export function timeParaHHMM(timeRaw) {
  if (!timeRaw) return null;
  if (timeRaw instanceof Date) return timeRaw.toISOString().substring(11, 16);
  return String(timeRaw).substring(0, 5);
}

export async function recalcularMinutosOcupados(prisma, disponibilidadeId) {
  if (!disponibilidadeId) return null;

  const result = await prisma.$queryRawUnsafe(`
    UPDATE disponibilidade_mensal dm
    SET minutos_ocupados = COALESCE((
      SELECT SUM((EXTRACT(EPOCH FROM pa.duracaoaula::time) / 60)::int)
      FROM pedidodeaula pa
      JOIN estado e ON pa.estadoidestado = e.idestado
      WHERE pa.disponibilidade_mensal_id = $1
        AND LOWER(e.tipoestado) IN ('pendente', 'confirmado', 'aprovado')
    ), 0)
    WHERE dm.iddisponibilidade_mensal = $1
    RETURNING dm.iddisponibilidade_mensal, dm.minutos_ocupados
  `, parseInt(disponibilidadeId, 10));

  return result?.[0] || null;
}

export async function recalcularMinutosOcupadosMuitos(prisma, disponibilidadeIds) {
  const ids = [...new Set((disponibilidadeIds || []).filter(Boolean).map((id) => parseInt(id, 10)))];
  const result = [];
  for (const id of ids) {
    result.push(await recalcularMinutosOcupados(prisma, id));
  }
  return result;
}

export async function encontrarDisponibilidadeCompativel(prisma, {
  professorUserId,
  data,
  horainicio,
  duracaoMinutos,
  modalidadeProfessorId,
}) {
  if (!professorUserId || !data || !horainicio || !duracaoMinutos) return null;

  const dataStr = data instanceof Date
    ? data.toISOString().split('T')[0]
    : String(data).split('T')[0];
  const horaStr = timeParaHHMM(horainicio);

  const modalidadeCondition = modalidadeProfessorId
    ? 'AND modalidadesprofessoridmodalidadeprofessor = $5'
    : '';
  const values = [
    parseInt(professorUserId, 10),
    dataStr,
    horaStr,
    parseInt(duracaoMinutos, 10),
  ];
  if (modalidadeProfessorId) values.push(parseInt(modalidadeProfessorId, 10));

  const rows = await prisma.$queryRawUnsafe(`
    SELECT iddisponibilidade_mensal
    FROM disponibilidade_mensal
    WHERE professorutilizadoriduser = $1
      AND data = $2::date
      AND ativo = true
      AND $3::time >= horainicio
      AND ($3::time + $4 * INTERVAL '1 minute') <= horafim
      ${modalidadeCondition}
    ORDER BY horainicio ASC
    LIMIT 1
  `, ...values);

  return rows?.[0]?.iddisponibilidade_mensal || null;
}
