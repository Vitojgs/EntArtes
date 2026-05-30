import * as eventosController from "../controllers/eventos.controller.js";
import { verifyToken, hasRole } from "../middleware/auth.middleware.js";

export default async function eventosRoutes(fastify) {
  fastify.addHook("onRequest", async (req, reply) => {
    return verifyToken(req, reply);
  });

  fastify.get("/", {
    schema: {
      tags: ["Eventos"],
      description: "Listar todos os eventos",
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
  }, eventosController.getAllEventos);

  fastify.get("/:id", {
    schema: {
      tags: ["Eventos"],
      description: "Obter evento por ID",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID do evento" }
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
  }, eventosController.getEventoById);

  fastify.post("/", {
    schema: {
      tags: ["Eventos"],
      description: "Criar novo evento",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título do evento" },
          descricao: { type: "string", description: "Descrição do evento" },
          tipo: { type: "string", description: "Tipo/categoria (Workshop, Espetáculo, Prova, ...)" },
          hora: { type: "string", description: "Hora do evento (HH:mm)" },
          datas: { type: "array", items: { type: "string" }, description: "Datas do evento (formato ISO)" },
          datafim: { type: "string", description: "Data de fim do evento (formato ISO)" },
          local: { type: "string", description: "Localização do evento" },
          imagem: { type: "string", description: "URL da imagem" },
          linkBilhetes: { type: "string", description: "Link para compra de bilhetes" },
          publicado: { type: "boolean", description: "Estado de publicação" },
          destaque: { type: "boolean", description: "Destacar evento" }
        },
        required: ["titulo"]
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
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return eventosController.createEvento(req, reply);
  });

  fastify.put("/:id", {
    schema: {
      tags: ["Eventos"],
      description: "Atualizar evento existente",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID do evento" }
        },
        required: ["id"]
      },
      body: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título do evento" },
          descricao: { type: "string", description: "Descrição do evento" },
          datas: { type: "array", items: { type: "string" }, description: "Datas do evento (formato ISO)" },
          datafim: { type: "string", description: "Data de fim do evento (formato ISO)" },
          local: { type: "string", description: "Localização do evento" },
          imagem: { type: "string", description: "URL da imagem" },
          linkBilhetes: { type: "string", description: "Link para compra de bilhetes" },
          publicado: { type: "boolean", description: "Estado de publicação" },
          destaque: { type: "boolean", description: "Destacar evento" }
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
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return eventosController.updateEvento(req, reply);
  });

  fastify.delete("/:id", {
    schema: {
      tags: ["Eventos"],
      description: "Eliminar evento",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID do evento" }
        },
        required: ["id"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" }
          }
        }
      }
    }
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return eventosController.deleteEvento(req, reply);
  });

  fastify.put("/:id/publish", {
    schema: {
      tags: ["Eventos"],
      description: "Publicar ou despublicar evento",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID do evento" }
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
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return eventosController.publishEvento(req, reply);
  });

  fastify.post("/:id/presenca", {
    schema: {
      tags: ["Eventos"],
      description: "Confirmar presença em evento",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: { id: { type: "string" } },
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
  }, eventosController.confirmPresenca);

  fastify.delete("/:id/presenca", {
    schema: {
      tags: ["Eventos"],
      description: "Cancelar presença em evento",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: { id: { type: "string" } },
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
  }, eventosController.cancelPresenca);

  fastify.get("/:id/presencas", {
    schema: {
      tags: ["Eventos"],
      description: "Listar presenças de um evento (admin)",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: { id: { type: "string" } },
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
  }, eventosController.getPresencas);

  fastify.get("/:id/presenca/check", {
    schema: {
      tags: ["Eventos"],
      description: "Verificar se o utilizador atual confirmou presença",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: { id: { type: "string" } },
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
  }, eventosController.checkUserPresenca);
}