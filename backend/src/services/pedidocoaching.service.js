import { PrismaClient } from "@prisma/client";
import { existeConflitoSala, timeParaMinutos } from "../utils/coachingHelpers.js";

const prisma = new PrismaClient();

const disponibilidade_mensalInclude = {
  include: {
    modalidadeprofessor: {
      include: {
        modalidade: true
      }
    },
    professor: {
      include: {
        utilizador: true
      }
    },
    sala: true,
  }
};

export async function getAllPedidosAula() {
  return prisma.pedidodeaula.findMany({
    include: {
      disponibilidade_mensal: disponibilidade_mensalInclude,
      grupo: true,
      estado: true,
      sala: true,
      encarregadoeducacao: {
        include: { utilizador: true }
      }
    },
    orderBy: { datapedido: 'desc' }
  });
}

export async function obterPedido(id) {
  return prisma.pedidodeaula.findUnique({
    where: { idpedidoaula: parseInt(id) },
    include: {
      disponibilidade_mensal: disponibilidade_mensalInclude,
      grupo: true,
      estado: true,
      sala: true,
      encarregadoeducacao: {
        include: { utilizador: true }
      }
    }
  });
}

export async function getPedidosByEncarregado(encarregadoUserId) {
  return prisma.pedidodeaula.findMany({
    where: { encarregadoeducacaoutilizadoriduser: encarregadoUserId },
    include: {
      disponibilidade_mensal: disponibilidade_mensalInclude,
      grupo: true,
      estado: true,
      sala: true
    },
    orderBy: { datapedido: 'desc' }
  });
}

export async function getAllPedidosEAulas() {
  const pedidos = await prisma.$queryRaw`
    SELECT
      pa.idpedidoaula,
      pa.data,
      pa.horainicio,
      pa.duracaoaula,
      pa.maxparticipantes,
      pa.estadoidestado,
      e.tipoestado as estado_nome,
      pa.datapedido,
      pa.privacidade,
      s.nomesala as sala_nome,
      s.idsala as sala_id,
      m.nome as modalidade_nome,
      COALESCE(dm.professorutilizadoriduser, pa.professorutilizadoriduser) as professor_id,
      u.nome as professor_nome,
      alu.nome as aluno_nome,
      pa.alunoutilizadoriduser as aluno_utilizador_id,
      pa.encarregadoeducacaoutilizadoriduser as encarregado_id
    FROM pedidodeaula pa
    JOIN estado e ON pa.estadoidestado = e.idestado
    JOIN sala s ON pa.salaidsala = s.idsala
    LEFT JOIN disponibilidade_mensal dm ON pa.disponibilidade_mensal_id = dm.iddisponibilidade_mensal
    LEFT JOIN modalidadeprofessor mp ON dm.modalidadesprofessoridmodalidadeprofessor = mp.idmodalidadeprofessor
    LEFT JOIN modalidade m ON mp.modalidadeidmodalidade = m.idmodalidade
    LEFT JOIN utilizador u ON COALESCE(dm.professorutilizadoriduser, pa.professorutilizadoriduser) = u.iduser
    LEFT JOIN utilizador alu ON pa.alunoutilizadoriduser = alu.iduser
    ORDER BY pa.data DESC, pa.horainicio DESC
  `;

  const pedidoIds = pedidos.map(p => p.idpedidoaula);
  const participantesMap = await getParticipantesPorPedidos(pedidoIds);

  return pedidos.map(p => {
    let horaFmt = '';
    const hora = p.horainicio;
    if (hora) {
      if (hora instanceof Date) {
        horaFmt = hora.toISOString().substring(11, 16);
      } else if (typeof hora === 'string') {
        horaFmt = hora.substring(0, 5);
      } else {
        horaFmt = String(hora).substring(0, 5);
      }
    }

    let duracaoMin = 60;
    const duracao = p.duracaoaula;
    if (duracao) {
      if (duracao instanceof Date) {
        duracaoMin = duracao.getUTCHours() * 60 + duracao.getUTCMinutes();
      } else if (typeof duracao === 'string') {
        const parts = duracao.split(':');
        if (parts.length >= 2) {
          duracaoMin = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
      }
    }

    const [hH, hM] = horaFmt.split(':').map(Number);
    const endMin = (hH || 0) * 60 + (hM || 0) + duracaoMin;
    const horaFim = String(Math.floor(endMin / 60)).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');

    const rawStatus = (p.estado_nome || '').toUpperCase();
    const statusMap = {
      'PENDENTE': 'PENDENTE', 'CONFIRMADO': 'CONFIRMADA', 'APROVADO': 'APROVADA',
      'REJEITADO': 'REJEITADA', 'REALIZADO': 'REALIZADA', 'CANCELADO': 'CANCELADA',
      'CONCLUÍDO': 'CONCLUÍDA',
    };
    const normalizedStatus = statusMap[rawStatus] || rawStatus;

    return {
      id: String(p.idpedidoaula),
      alunoId: String(p.aluno_utilizador_id || ''),
      alunoNome: p.aluno_nome || '',
      encarregadoId: String(p.encarregado_id || ''),
      professorId: String(p.professor_id || ''),
      professorNome: p.professor_nome || '',
      estudioId: String(p.sala_id || ''),
      estudioNome: p.sala_nome || '',
      modalidade: p.modalidade_nome || '',
      data: p.data ? new Date(p.data).toISOString().split('T')[0] : '',
      horaInicio: horaFmt,
      horaFim,
      duracao: duracaoMin,
      status: normalizedStatus,
      criadoEm: p.datapedido ? new Date(p.datapedido).toISOString() : '',
      participantes: participantesMap[p.idpedidoaula] || []
    };
  });
}

export async function getPedidosPendentes() {
  const estadoPendente = await prisma.estado.findFirst({
    where: { tipoestado: 'PENDENTE' }
  });

  if (!estadoPendente) return [];

  return prisma.pedidodeaula.findMany({
    where: { estadoidestado: estadoPendente.idestado },
    include: {
      disponibilidade_mensal: disponibilidade_mensalInclude,
      grupo: true,
      estado: true,
      sala: true,
      encarregadoeducacao: {
        include: { utilizador: true }
      }
    },
    orderBy: { datapedido: 'asc' }
  });
}

export async function submeterPedidoAula(data) {
  const {
    data: dataAula,
    horainicio,
    duracaoaula,
    maxparticipantes,
    privacidade,
    disponibilidade_mensal_id,
    grupoidgrupo,
    salaidsala,
    encarregadoeducacaoutilizadoriduser
  } = data;

  const [h, m] = horainicio.split(':').map(Number);
  const inicioMin = h * 60 + m;
  const [dh, dm] = (duracaoaula || '01:00').split(':').map(Number);
  const fimMin = inicioMin + dh * 60 + dm;

  if (salaidsala) {
    const conflitoSala = await existeConflitoSala(
      parseInt(salaidsala), new Date(dataAula), inicioMin, fimMin
    );
    if (conflitoSala) {
      throw new Error('Sala/Estúdio já está ocupado neste horário. Escolha outra sala ou outro horário.');
    }
  }

  const estadoPendente = await prisma.estado.findFirst({
    where: { tipoestado: 'PENDENTE' }
  });

  if (!estadoPendente) {
    throw new Error('Estado PENDENTE não encontrado');
  }

  return prisma.pedidodeaula.create({
    data: {
      data: new Date(dataAula),
      horainicio: new Date(`2000-01-01T${horainicio}`),
      duracaoaula: new Date(`2000-01-01T${duracaoaula || '01:00'}`),
      maxparticipantes: parseInt(maxparticipantes || 10),
      datapedido: new Date(),
      privacidade: privacidade || false,
      disponibilidade_mensal_id: disponibilidade_mensal_id ? parseInt(disponibilidade_mensal_id) : null,
      grupoidgrupo: grupoidgrupo ? parseInt(grupoidgrupo) : null,
      estadoidestado: estadoPendente.idestado,
      salaidsala: salaidsala ? parseInt(salaidsala) : undefined,
      encarregadoeducacaoutilizadoriduser: parseInt(encarregadoeducacaoutilizadoriduser)
    },
    include: {
      disponibilidade_mensal: disponibilidade_mensalInclude,
      grupo: true,
      estado: true,
      sala: true,
      encarregadoeducacao: {
        include: { utilizador: true }
      }
    }
  });
}

export async function updatePedidoAulaStatus(id, novoEstadoTipo) {
  const estado = await prisma.estado.findFirst({
    where: { tipoestado: novoEstadoTipo }
  });

  if (!estado) {
    throw new Error(`Estado ${novoEstadoTipo} não encontrado`);
  }

  return prisma.pedidodeaula.update({
    where: { idpedidoaula: parseInt(id) },
    data: { estadoidestado: estado.idestado },
    include: {
      disponibilidade_mensal: disponibilidade_mensalInclude,
      estado: true,
      encarregadoeducacao: {
        include: { utilizador: true }
      },
      sala: true
    }
  });
}

export async function deletePedidoAula(id) {
  return prisma.pedidodeaula.delete({
    where: { idpedidoaula: parseInt(id) }
  });
}

export async function getEstados() {
  return prisma.estado.findMany();
}

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
