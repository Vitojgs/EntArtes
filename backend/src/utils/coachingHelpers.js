// helpers para func

import prisma from "../config/db.js";
 
// Converte data para minutos
export function timeParaMinutos(dateObj) {
  const iso = dateObj instanceof Date ? dateObj.toISOString() : String(dateObj);
  const [h, m] = iso.substring(11, 16).split(":").map(Number);
  return h * 60 + m;
}
 
// IDs dos estados ativos (pendente, confirmado, aprovado, concluído)
export async function getEstadosAtivos() {
  const estados = await prisma.estado.findMany({
    where: {
      tipoestado: { in: ['Pendente', 'Confirmado', 'Aprovado', 'Concluído'] }
    },
  });
  return estados.map((e) => e.idestado);
}
 
export async function existeConflitoSala(salaidsala, data, inicioMin, fimMin, excluirPedidoId) {
  const where = {
    salaidsala,
    data,
    estadoidestado: { in: await getEstadosAtivos() },
  };
  if (excluirPedidoId) where.idpedidoaula = { not: excluirPedidoId };
 

  const pedidos = await prisma.pedidodeaula.findMany({
    where,
    select: { horainicio: true, duracaoaula: true },
  });
 

  return pedidos.some((p) => {
    const pInicio = timeParaMinutos(p.horainicio);
    const pFim    = pInicio + timeParaMinutos(p.duracaoaula);
    return pInicio < fimMin && pFim > inicioMin;
  });
}
 

export async function existeConflitoProf(professorutilizadoriduser, data, inicioMin, fimMin, excluirPedidoId) {
  const pedidos = await prisma.pedidodeaula.findMany({
    where: {
      data,
      estadoidestado: { in: await getEstadosAtivos() },
      disponibilidade_mensal: { professorutilizadoriduser: Number(professorutilizadoriduser) },
      ...(excluirPedidoId ? { idpedidoaula: { not: excluirPedidoId } } : {}),
    },
    select: { horainicio: true, duracaoaula: true },
  });
 
  return pedidos.some((p) => {
    const pInicio = timeParaMinutos(p.horainicio);
    const pFim    = pInicio + timeParaMinutos(p.duracaoaula);
    return pInicio < fimMin && pFim > inicioMin;
  });
}