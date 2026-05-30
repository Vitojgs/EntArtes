import * as direcaoController from "../controllers/direcao.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/role.middleware.js";

export default async function direcaoRoutes(fastify) {
  fastify.addHook("onRequest", async (req, reply) => {
    return verifyToken(req, reply);
  });
  fastify.addHook("preHandler", authorizeRole("DIRECAO"));

  fastify.get("/coaching", {
    schema: {
      tags: ["Direção"],
      description: "Consultar todas as aulas",
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
  }, direcaoController.getAulas);

  fastify.get("/coaching/pending", {
    schema: {
      tags: ["Direção"],
      description: "Listar pedidos de aula pendentes",
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
  }, direcaoController.getPending);

  fastify.post("/coaching/:id/approve", {
    schema: {
      tags: ["Direção"],
      description: "Aprovar um pedido de aula",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID do pedido de aula" }
        },
        required: ["id"]
      },
      body: {
        type: "object",
        properties: {
          salaId: { type: "integer", description: "ID da sala para a aula" }
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
  }, direcaoController.approve);

  fastify.post("/coaching/:id/reject", {
    schema: {
      tags: ["Direção"],
      description: "Rejeitar um pedido de aula",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID do pedido de aula" }
        },
        required: ["id"]
      },
      body: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "Motivo da rejeição" }
        },
        required: ["motivo"]
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
  }, direcaoController.reject);

  fastify.post("/coaching/:id/realizado", {
    schema: {
      tags: ["Direção"],
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

  fastify.post("/coaching/:id/cancel", {
    schema: {
      tags: ["Direção"],
      description: "Cancelar um pedido de aula",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID do pedido de aula" }
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
  }, direcaoController.cancelarAulaDirecao);

  fastify.put("/coaching/:id/sala", {
    schema: {
      tags: ["Direção"],
      description: "Alterar sala/estúdio de um pedido de aula",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID do pedido de aula" }
        },
        required: ["id"]
      },
      body: {
        type: "object",
        properties: {
          salaId: { type: "integer", description: "ID da nova sala" }
        },
        required: ["salaId"]
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
  }, direcaoController.editarSalaDirecao);

  fastify.get("/relatorio/aulas/:ano/:mes", {
    schema: {
      tags: ["Direção"],
      description: "Obter relatório de aulas por mês",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          ano: { type: "string", description: "Ano (ex: 2026)" },
          mes: { type: "string", description: "Mês (01-12)" }
        },
        required: ["ano", "mes"]
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
  }, direcaoController.relatorioAulas);

  fastify.post("/ocupacao", {
    schema: {
      tags: ["Direção"],
      description: "Criar ocupação de sala (marcação direta)",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["salaId", "data", "horainicio", "horafim"],
        properties: {
          salaId: { type: "integer" },
          data: { type: "string" },
          horainicio: { type: "string" },
          horafim: { type: "string" },
          tipo: { type: "string" },
          responsavel: { type: "string" },
          observacoes: { type: "string" },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" }
          }
        }
      }
    }
  }, direcaoController.criarOcupacaoSala);

  fastify.patch("/ocupacao/:id", {
    schema: {
      tags: ["Direção"],
      description: "Atualizar ocupação de sala",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID da ocupação" },
        },
        required: ["id"],
      },
      body: {
        type: "object",
        required: ["salaId", "data", "horainicio", "horafim"],
        properties: {
          salaId: { type: "integer" },
          data: { type: "string" },
          horainicio: { type: "string" },
          horafim: { type: "string" },
          tipo: { type: "string" },
          responsavel: { type: "string" },
          observacoes: { type: "string" },
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
  }, direcaoController.atualizarOcupacaoSala);

  fastify.delete("/ocupacao/:id", {
    schema: {
      tags: ["Direção"],
      description: "Eliminar ocupação de sala",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID da ocupação" },
        },
        required: ["id"],
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
  }, direcaoController.cancelarOcupacaoSala);

  fastify.get("/relatorio/presencas", {
    schema: {
      tags: ["Direção"],
      description: "Obter relatório de presenças por período",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          datainicio: { type: "string", description: "Data de início (YYYY-MM-DD)" },
          datafim: { type: "string", description: "Data de fim (YYYY-MM-DD)" }
        },
        required: ["datainicio", "datafim"]
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
  }, direcaoController.relatorioPresencas);
}
