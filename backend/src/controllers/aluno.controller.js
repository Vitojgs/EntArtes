import * as alunoService from "../services/aluno.service.js";
import { buscarIntervalosLivres, calcularIntervalosSlot } from "../services/aluno.service.js";

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

export const getAulas = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("ALUNO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const aulas = await alunoService.getAlunoAulas(req.user.id);
    return reply.send({ success: true, data: aulas });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const getDisponibilidades = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("ALUNO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const disponibilidades = await alunoService.getAllDisponibilidadesMensais();
    const slotIds = disponibilidades.map(d => d.iddisponibilidade_mensal);
    const intervalosMap = await buscarIntervalosLivres(slotIds);
    const data = disponibilidades.map(d => formatDisponibilidade(d, intervalosMap[d.iddisponibilidade_mensal]));
    return reply.send({ success: true, data });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};
