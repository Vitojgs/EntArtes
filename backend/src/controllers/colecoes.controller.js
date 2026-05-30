import * as colecoesService from "../services/colecoes.service.js";

export const getAllColecoes = async (req, reply) => {
  try {
    const colecoes = await colecoesService.getAllColecoes();
    return reply.send({ success: true, data: colecoes });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const getColecaoById = async (req, reply) => {
  try {
    const { id } = req.params;
    const colecao = await colecoesService.getColecaoById(parseInt(id));
    if (!colecao) {
      return reply.status(404).send({ success: false, error: "Coleção não encontrada" });
    }
    return reply.send({ success: true, data: colecao });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

export const createColecao = async (req, reply) => {
  try {
    const colecao = await colecoesService.createColecao(req.body);
    return reply.status(201).send({ success: true, data: colecao });
  } catch (err) {
    return reply.status(400).send({ success: false, error: err.message });
  }
};

export const updateColecao = async (req, reply) => {
  try {
    const { id } = req.params;
    const colecao = await colecoesService.updateColecao(parseInt(id), req.body);
    return reply.send({ success: true, data: colecao });
  } catch (err) {
    return reply.status(400).send({ success: false, error: err.message });
  }
};

export const deleteColecao = async (req, reply) => {
  try {
    const { id } = req.params;
    await colecoesService.deleteColecao(parseInt(id));
    return reply.send({ success: true, data: { message: "Coleção eliminada" } });
  } catch (err) {
    return reply.status(400).send({ success: false, error: err.message });
  }
};

export const addFigurino = async (req, reply) => {
  try {
    const { id, figurinoId } = req.params;
    const result = await colecoesService.addFigurinoToColecao(parseInt(id), parseInt(figurinoId));
    return reply.send({ success: true, data: result });
  } catch (err) {
    return reply.status(400).send({ success: false, error: err.message });
  }
};

export const removeFigurino = async (req, reply) => {
  try {
    const { id, figurinoId } = req.params;
    await colecoesService.removeFigurinoFromColecao(parseInt(id), parseInt(figurinoId));
    return reply.send({ success: true, data: { message: "Figurino removido da coleção" } });
  } catch (err) {
    return reply.status(400).send({ success: false, error: err.message });
  }
};

export const getDisponibilidade = async (req, reply) => {
  try {
    const { id } = req.params;
    const { dataInicio, dataFim } = req.query;

    if (!dataInicio || !dataFim) {
      return reply.status(400).send({
        success: false,
        error: "Parâmetros dataInicio e dataFim são obrigatórios",
      });
    }

    const result = await colecoesService.getDisponibilidadeFigurino(
      parseInt(id),
      dataInicio,
      dataFim
    );

    if (!result) {
      return reply.status(404).send({ success: false, error: "Figurino não encontrado" });
    }

    return reply.send({ success: true, data: result });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};
