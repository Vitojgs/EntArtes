import * as professorAulasController from "../controllers/professor-coaching.controller.js";
import * as direcaoController from "../controllers/direcao.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

export default async function professorAulasRoutes(fastify) {
  fastify.addHook("onRequest", async (req, reply) => {
    return verifyToken(req, reply);
  });

  fastify.get("/coaching", {
    schema: {
      tags: ["Professor"],
      description: "Listar aulas do professor autenticado",
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array" }
          }
        }
      }
    }
  }, professorAulasController.getAulas);

  fastify.post("/coaching/:id/realizado", {
    schema: {
      tags: ["Professor"],
      description: "Confirmar realização de uma aula",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID da aula" }
        },
        required: ["id"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" }
          }
        }
      }
    }
  }, direcaoController.confirmarRealizado);

  fastify.put("/coaching/:id/status", {
    schema: {
      tags: ["Professor"],
      description: "Atualizar status de uma aula",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string" }
        }
      },
      body: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["CONFIRMADO", "REALIZADO", "CANCELADO"] }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" }
          }
        }
      }
    }
  }, professorAulasController.updateStatus);
}
