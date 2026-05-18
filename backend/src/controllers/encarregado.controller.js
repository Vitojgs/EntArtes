import * as encarregadoService from "../services/encarregado.service.js";
import { getAllDisponibilidadesMensais, buscarIntervalosLivres, calcularIntervalosSlot } from "../services/aluno.service.js";
import prisma from "../config/db.js";

const parseMin = (t) => {
  if (!t) return 0;
  const s = t instanceof Date ? t.toISOString().substring(11, 16) : String(t).substring(0, 5);
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};

function formatDisponibilidade(d, intervalosInfo) {
  const horaInicio = d.horainicio instanceof Date ? d.horainicio.toISOString().substring(11, 16) : String(d.horainicio).substring(0, 5);
  const horaFim = d.horafim instanceof Date ? d.horafim.toISOString().substring(11, 16) : String(d.horafim).substring(0, 5);
  const minInicio = parseMin(d.horainicio);
  const minFim = parseMin(d.horafim);

  let maxDuracao = minFim - minInicio;
  let intervalosLivres = [];

  if (intervalosInfo && intervalosInfo.bookings) {
    const calc = calcularIntervalosSlot(minInicio, minFim, intervalosInfo.bookings);
    intervalosLivres = calc.intervalosLivres;
    maxDuracao = calc.maxDuracao;
  }

  return {
    id: String(d.iddisponibilidade_mensal),
    professorId: String(d.professorutilizadoriduser),
    professorNome: d.professor_nome || '',
    data: d.data ? new Date(d.data).toISOString().split('T')[0] : '',
    horaInicio,
    horaFim,
    modalidadeId: String(d.idmodalidadeprofessor),
    modalidade: d.modalidades_nome || '',
    maxDuracao,
    intervalosLivres,
  };
}

export const getDisponibilidades = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("ENCARREGADO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const disponibilidades = await getAllDisponibilidadesMensais();
    const slotIds = disponibilidades.map(d => d.iddisponibilidade_mensal);
    const intervalosMap = await buscarIntervalosLivres(slotIds);
    const data = disponibilidades.map(d => formatDisponibilidade(d, intervalosMap[d.iddisponibilidade_mensal]));
    return reply.send({ success: true, data });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const getAulas = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("ENCARREGADO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const aulas = await encarregadoService.getEncarregadoAulas(req.user.id);
    return reply.send({ success: true, data: aulas });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const getAulasOpen = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("ENCARREGADO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const grupos = await encarregadoService.getGruposAbertos();
    return reply.send({ success: true, data: grupos });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const getJoinableCoachings = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("ENCARREGADO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const coachings = await encarregadoService.getJoinableCoachings(req.user.id);
    return reply.send({ success: true, data: coachings });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const participar = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("ENCARREGADO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { alunoId } = req.body;
    if (!alunoId) return reply.status(400).send({ success: false, error: "alunoId obrigatório" });
    const result = await encarregadoService.marcarAula(
      parseInt(req.params.pedidoId), parseInt(alunoId), req.user.id
    );
    return reply.status(201).send({ success: true, data: result });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const cancelarParticipacao = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("ENCARREGADO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const result = await encarregadoService.cancelarParticipacaoAula(
      req.params.pedidoId, req.user.id
    );
    return reply.send({ success: true, data: result });
  } catch (err) {
    const message = err.message || '';
    if (message.includes('encontrado') || message.includes('permissão') || message.includes('Só pode')) {
      return reply.status(400).send({ success: false, error: message });
    }
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const submeterPedidoAula = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("ENCARREGADO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { data, horainicio, duracaoaula, maxparticipantes, disponibilidade_mensal_id, professor_utilizador_id, alunoutilizadoriduser, salaidsala, privacidade } = req.body;

    if (!data || !horainicio || !salaidsala) {
      return reply.status(400).send({ success: false, error: "Campos obrigatórios em falta" });
    }

    const result = await encarregadoService.submeterPedidoAula(
      { data, horainicio, duracaoaula, maxparticipantes, disponibilidade_mensal_id, professor_utilizador_id, alunoutilizadoriduser, salaidsala, privacidade },
      req.user.id
    );

    const row = Array.isArray(result) && result.length > 0 ? result[0] : result;
    return reply.status(201).send({ success: true, data: row });
  } catch (err) {
    const message = err.message || '';
    if (message.includes('passado') || message.includes('hora') || message.includes('obrigatório') || message.includes('formato') || message.includes('reservado')) {
      return reply.status(400).send({ success: false, error: message });
    }
    return reply.status(500).send({ success: false, error: err.message });
  }
};
