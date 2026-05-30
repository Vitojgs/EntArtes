import * as alteracaoController from "../controllers/alteracaoperfil.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/role.middleware.js";

export default async function alteracaoPerfilRoutes(fastify) {
  fastify.addHook("onRequest", async (req, reply) => {
    return verifyToken(req, reply);
  });

  // Encarregado solicita alteração para um aluno
  fastify.post("/aluno/:id/solicitar-alteracao", {
    schema: {
      tags: ["Alterações Perfil"],
      description: "Encarregado solicita alteração de dados do aluno (dataNascimento, modalidades)",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "integer", description: "ID do aluno" },
        },
      },
      body: {
        type: "object",
        properties: {
          novodataNascimento: { type: "string", format: "date", description: "Nova data de nascimento (YYYY-MM-DD)" },
          novasmodalidades: { type: "array", items: { type: "integer" }, description: "Novos IDs das modalidades" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
          },
        },
      },
    },
    preHandler: authorizeRole("ENCARREGADO"),
  }, alteracaoController.solicitar);

  // Encarregado lista as suas solicitações
  fastify.get("/minhas-solicitacoes", {
    schema: {
      tags: ["Alterações Perfil"],
      description: "Lista solicitações feitas pelo encarregado autenticado",
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array" },
          },
        },
      },
    },
    preHandler: authorizeRole("ENCARREGADO"),
  }, alteracaoController.listarPorEncarregado);

  // Direção lista pedidos pendentes
  fastify.get("/alteracoes-pendentes", {
    schema: {
      tags: ["Alterações Perfil"],
      description: "Lista pedidos de alteração pendentes (apenas Direção)",
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array" },
          },
        },
      },
    },
    preHandler: authorizeRole("DIRECAO"),
  }, alteracaoController.listarPendentes);

  // Direção aprova pedido
  fastify.put("/alteracao/:id/aprovar", {
    schema: {
      tags: ["Alterações Perfil"],
      description: "Direção aprova pedido de alteração",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "integer", description: "ID do pedido de alteração" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
          },
        },
      },
    },
    preHandler: authorizeRole("DIRECAO"),
  }, alteracaoController.aprovar);

  // Direção rejeita pedido
  fastify.put("/alteracao/:id/rejeitar", {
    schema: {
      tags: ["Alterações Perfil"],
      description: "Direção rejeita pedido de alteração com motivo",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "integer", description: "ID do pedido de alteração" },
        },
      },
      body: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "Motivo da rejeição" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
          },
        },
      },
    },
    preHandler: authorizeRole("DIRECAO"),
  }, alteracaoController.rejeitar);
}
