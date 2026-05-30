import * as colecoesController from "../controllers/colecoes.controller.js";
import { verifyToken, hasRole } from "../middleware/auth.middleware.js";

export default async function colecoesRoutes(fastify) {
  fastify.addHook("onRequest", async (req, reply) => {
    return verifyToken(req, reply);
  });

  fastify.get("/", {
    schema: {
      tags: ["Coleções"],
      description: "Listar todas as coleções",
      security: [{ bearerAuth: [] }],
    },
  }, colecoesController.getAllColecoes);

  fastify.get("/:id", {
    schema: {
      tags: ["Coleções"],
      description: "Obter uma coleção por ID",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: { id: { type: "integer" } },
      },
    },
  }, colecoesController.getColecaoById);

  fastify.post("/", {
    schema: {
      tags: ["Coleções"],
      description: "Criar uma nova coleção",
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return colecoesController.createColecao(req, reply);
  });

  fastify.put("/:id", {
    schema: {
      tags: ["Coleções"],
      description: "Atualizar uma coleção",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: { id: { type: "integer" } },
      },
    },
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return colecoesController.updateColecao(req, reply);
  });

  fastify.delete("/:id", {
    schema: {
      tags: ["Coleções"],
      description: "Eliminar uma coleção",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: { id: { type: "integer" } },
      },
    },
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return colecoesController.deleteColecao(req, reply);
  });

  fastify.post("/:id/figurinos/:figurinoId", {
    schema: {
      tags: ["Coleções"],
      description: "Adicionar figurino a uma coleção",
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return colecoesController.addFigurino(req, reply);
  });

  fastify.delete("/:id/figurinos/:figurinoId", {
    schema: {
      tags: ["Coleções"],
      description: "Remover figurino de uma coleção",
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return colecoesController.removeFigurino(req, reply);
  });
}
