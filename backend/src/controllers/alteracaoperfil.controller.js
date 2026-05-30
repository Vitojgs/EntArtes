import * as alteracaoService from "../services/alteracaoperfil.service.js";

export const solicitar = async (req, reply) => {
  try {
    const { id } = req.params;
    const result = await alteracaoService.solicitarAlteracao(
      parseInt(id),
      req.user.id,
      req.body
    );
    return reply.send({ success: true, data: result });
  } catch (err) {
    return reply.status(400).send({ success: false, error: err.message });
  }
};

export const listarPendentes = async (req, reply) => {
  try {
    const result = await alteracaoService.listarPendentes();
    return reply.send({ success: true, data: result });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const aprovar = async (req, reply) => {
  try {
    const { id } = req.params;
    const result = await alteracaoService.aprovarAlteracao(parseInt(id), req.user.id);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return reply.status(400).send({ success: false, error: err.message });
  }
};

export const rejeitar = async (req, reply) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const result = await alteracaoService.rejeitarAlteracao(parseInt(id), req.user.id, motivo);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return reply.status(400).send({ success: false, error: err.message });
  }
};

export const listarPorAluno = async (req, reply) => {
  try {
    const { id } = req.params;
    const result = await alteracaoService.listarPorAluno(parseInt(id));
    return reply.send({ success: true, data: result });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const listarPorEncarregado = async (req, reply) => {
  try {
    const result = await alteracaoService.listarPorEncarregado(req.user.id);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};
