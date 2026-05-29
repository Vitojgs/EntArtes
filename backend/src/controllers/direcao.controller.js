import * as direcaoService from "../services/direcao.service.js";
import { createAuditLog } from "../services/audit.service.js";

export const getAulas = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const aulas = await direcaoService.consultarAula();
    return reply.send({ success: true, data: aulas });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const getPending = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const aulas = await direcaoService.getPendingAulas();
    return reply.send({ success: true, data: aulas });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const approve = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { id } = req.params;
    const { salaId } = req.body || {};
    const result = await direcaoService.avaliarPedido(id, 'aprovar', salaId);
    await createAuditLog(req.user.id, req.user.nome, 'APPROVE', 'PedidoAula', parseInt(id), 'Aula aprovada');
    return reply.send({ success: true, data: result });
  } catch (err) {
    const message = err.message || '';
    if (message.includes('já') || message.includes('aprovado') || message.includes('confirmado') || message.includes('estado')) {
      return reply.status(400).send({ success: false, error: message });
    }
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const reject = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      return reply.status(400).send({ success: false, error: "Motivo de rejeição obrigatório" });
    }

    const result = await direcaoService.avaliarPedido(id, 'rejeitar', null, motivo);
    await createAuditLog(req.user.id, req.user.nome, 'REJECT', 'PedidoAula', parseInt(id), `Aula rejeitada: ${motivo}`);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const confirmarRealizado = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO") && !req.user.normalizedRoles.includes("PROFESSOR")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { id } = req.params;
    const result = await direcaoService.confirmarAulaRealizada(id);
    await createAuditLog(req.user.id, req.user.nome, 'UPDATE', 'Aula', parseInt(id), 'Realização confirmada');
    return reply.send({ success: true, data: result });
  } catch (err) {
    const message = err.message || '';
    if (message.includes('passado') || message.includes('futuro') || message.includes('realizar')) {
      return reply.status(400).send({ success: false, error: message });
    }
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const relatorioAulas = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { ano, mes } = req.params;
    const relatorio = await direcaoService.getRelatorioAulasMensal(ano, mes);
    return reply.send({ success: true, data: relatorio });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const cancelarAulaDirecao = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { id } = req.params;
    const result = await direcaoService.cancelarPedidoAula(id);
    await createAuditLog(req.user.id, req.user.nome, 'CANCEL', 'PedidoAula', parseInt(id), 'Aula cancelada pela direção');
    return reply.send({ success: true, data: result });
  } catch (err) {
    const message = err.message || '';
    if (message.includes('já') || message.includes('cancelado') || message.includes('não encontrado')) {
      return reply.status(400).send({ success: false, error: message });
    }
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const editarSalaDirecao = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { id } = req.params;
    const { salaId } = req.body || {};
    if (!salaId) {
      return reply.status(400).send({ success: false, error: "salaId é obrigatório" });
    }
    const result = await direcaoService.editarSalaPedidoAula(id, salaId);
    await createAuditLog(req.user.id, req.user.nome, 'UPDATE', 'PedidoAula', parseInt(id), `Sala alterada para ${salaId}`);
    return reply.send({ success: true, data: result });
  } catch (err) {
    const message = err.message || '';
    if (message.includes('não encontrado')) {
      return reply.status(400).send({ success: false, error: message });
    }
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const criarOcupacaoSala = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { salaId, data, horainicio, horafim, tipo, responsavel, observacoes } = req.body || {};
    const result = await direcaoService.criarOcupacaoSala(
      { salaId, data, horainicio, horafim, tipo, responsavel, observacoes },
      req.user.id
    );
    return reply.status(201).send({ success: true, data: result });
  } catch (err) {
    const message = err.message || '';
    if (message.includes('ocupação') || message.includes('obrigatório')) {
      return reply.status(400).send({ success: false, error: message });
    }
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const atualizarOcupacaoSala = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { id } = req.params;
    const { salaId, data, horainicio, horafim, tipo, responsavel, observacoes } = req.body || {};
    const result = await direcaoService.atualizarOcupacaoSala(
      id,
      { salaId, data, horainicio, horafim, tipo, responsavel, observacoes },
      req.user.id
    );
    return reply.send({ success: true, data: result });
  } catch (err) {
    const message = err.message || '';
    if (message.includes('ocupação') || message.includes('encontrada')) {
      return reply.status(400).send({ success: false, error: message });
    }
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const relatorioPresencas = async (req, reply) => {
  try {
    if (!req.user.normalizedRoles.includes("DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    const { datainicio, datafim } = req.query;
    if (!datainicio || !datafim) {
      return reply.status(400).send({ success: false, error: "datainicio e datafim obrigatórios" });
    }
    const relatorio = await direcaoService.getRelatorioPresencas(datainicio, datafim);
    return reply.send({ success: true, data: relatorio });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};
