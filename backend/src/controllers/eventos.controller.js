import * as eventosService from "../services/eventos.service.js";

export const getAllEventos = async (req, reply) => {
  try {
    const eventos = await eventosService.getAllEventos();
    return reply.send({ success: true, data: eventos });
  } catch (error) {
    return reply.status(400).send({ success: false, error: error.message });
  }
};

export const getEventoById = async (req, reply) => {
  try {
    const { id } = req.params;
    const evento = await eventosService.getEventoById(parseInt(id));
    if (!evento) {
      return reply.status(404).send({ success: false, error: "Evento não encontrado" });
    }
    return reply.send({ success: true, data: evento });
  } catch (error) {
    return reply.status(400).send({ success: false, error: error.message });
  }
};

export const createEvento = async (req, reply) => {
  try {
    const evento = await eventosService.createEvento(req.body, req.user.id, req.user.nome);
    return reply.status(201).send({ success: true, data: evento });
  } catch (error) {
    return reply.status(400).send({ success: false, error: error.message });
  }
};

export const updateEvento = async (req, reply) => {
  try {
    const { id } = req.params;
    const evento = await eventosService.updateEvento(parseInt(id), req.body, req.user.id, req.user.nome);
    return reply.send({ success: true, data: evento });
  } catch (error) {
    return reply.status(400).send({ success: false, error: error.message });
  }
};

export const deleteEvento = async (req, reply) => {
  try {
    const { id } = req.params;
    await eventosService.deleteEvento(parseInt(id), req.user.id, req.user.nome);
    return reply.send({ success: true, data: { message: "Evento eliminado com sucesso" } });
  } catch (error) {
    return reply.status(400).send({ success: false, error: error.message });
  }
};

export const publishEvento = async (req, reply) => {
  try {
    const { id } = req.params;
    const evento = await eventosService.publishEvento(parseInt(id), req.user.id, req.user.nome);
    return reply.send({ success: true, data: evento });
  } catch (error) {
    return reply.status(400).send({ success: false, error: error.message });
  }
};

export const confirmPresenca = async (req, reply) => {
  try {
    const { id } = req.params;
    const result = await eventosService.confirmPresenca(parseInt(id), parseInt(req.user.id));
    return reply.send({ success: true, data: result });
  } catch (error) {
    return reply.status(400).send({ success: false, error: error.message });
  }
};

export const cancelPresenca = async (req, reply) => {
  try {
    const { id } = req.params;
    const result = await eventosService.cancelPresenca(parseInt(id), parseInt(req.user.id));
    return reply.send({ success: true, data: result });
  } catch (error) {
    return reply.status(400).send({ success: false, error: error.message });
  }
};

export const getPresencas = async (req, reply) => {
  try {
    const { id } = req.params;
    const result = await eventosService.getPresencas(parseInt(id));
    return reply.send({ success: true, data: result });
  } catch (error) {
    return reply.status(400).send({ success: false, error: error.message });
  }
};

export const checkUserPresenca = async (req, reply) => {
  try {
    const { id } = req.params;
    const result = await eventosService.checkUserPresenca(parseInt(id), parseInt(req.user.id));
    return reply.send({ success: true, data: result });
  } catch (error) {
    return reply.status(400).send({ success: false, error: error.message });
  }
};