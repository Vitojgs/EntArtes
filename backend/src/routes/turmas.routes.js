import * as turmasController from "../controllers/turmas.controller.js";
import { verifyToken, hasRole } from "../middleware/auth.middleware.js";

export default async function turmasRoutes(fastify) {
  fastify.addHook("onRequest", async (req, reply) => {
    return verifyToken(req, reply);
  });

  fastify.get("/", {
    schema: {
      tags: ["Turmas"],
      description: "Listar todas as turmas",
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
  }, turmasController.getAllTurmas);

  fastify.post("/", {
    schema: {
      tags: ["Turmas"],
      description: "Criar nova turma",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["nomegrupo", "modalidade", "nivel"],
        properties: {
          nome: { type: "string", description: "Nome da turma" },
          modalidade: { type: "string", description: "Modalidade da turma" },
          nivel: { type: "string", description: "Nível da turma" },
          descricao: { type: "string", description: "Descrição da turma" },
          faixaEtaria: { type: "string", description: "Faixa etária" },
          professorId: { type: "integer", description: "ID do professor" },
          estudioId: { type: "integer", description: "ID da sala/estúdio" },
          diasSemana: { type: "array", items: { type: "integer" }, description: "Dias da semana (0-6)" },
          horaInicio: { type: "string", description: "Hora de início (HH:MM)" },
          horaFim: { type: "string", description: "Hora de fim (HH:MM)" },
          duracao: { type: "integer", description: "Duração em minutos" },
          lotacaoMaxima: { type: "integer", description: "Lotação máxima" },
          dataInicio: { type: "string", description: "Data de início (YYYY-MM-DD)" },
          dataFim: { type: "string", description: "Data de fim (YYYY-MM-DD)" },
          cor: { type: "string", description: "Cor de identificação" },
          requisitos: { type: "string", description: "Requisitos da turma" }
        }
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
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO", "PROFESSOR")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.createTurma(req, reply);
  });

  fastify.put("/:id", {
    schema: {
      tags: ["Turmas"],
      description: "Atualizar turma",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da turma" }
        }
      },
      body: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da turma" },
          modalidade: { type: "string", description: "Modalidade da turma" },
          nivel: { type: "string", description: "Nível da turma" },
          descricao: { type: "string", description: "Descrição da turma" },
          faixaEtaria: { type: "string", description: "Faixa etária" },
          professorId: { type: "integer", description: "ID do professor" },
          estudioId: { type: "integer", description: "ID da sala/estúdio" },
          diasSemana: { type: "array", items: { type: "integer" }, description: "Dias da semana (0-6)" },
          horaInicio: { type: "string", description: "Hora de início (HH:MM)" },
          horaFim: { type: "string", description: "Hora de fim (HH:MM)" },
          duracao: { type: "integer", description: "Duração em minutos" },
          lotacaoMaxima: { type: "integer", description: "Lotação máxima" },
          dataInicio: { type: "string", description: "Data de início (YYYY-MM-DD)" },
          dataFim: { type: "string", description: "Data de fim (YYYY-MM-DD)" },
          cor: { type: "string", description: "Cor de identificação" },
          requisitos: { type: "string", description: "Requisitos da turma" }
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
    if (!hasRole(req.user.normalizedRoles, "DIRECAO", "PROFESSOR")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.updateTurma(req, reply);
  });

  fastify.delete("/:id", {
    schema: {
      tags: ["Turmas"],
      description: "Eliminar turma",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da turma" }
        }
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
    return turmasController.deleteTurma(req, reply);
  });

  fastify.put("/:id/enroll", {
    schema: {
      tags: ["Turmas"],
      description: "Inscrever aluno na turma",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da turma" }
        }
      },
      body: {
        type: "object",
        required: ["alunoId"],
        properties: {
          alunoId: { type: "integer", description: "ID do aluno a matricular" }
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
    if (!hasRole(req.user.normalizedRoles, "DIRECAO", "PROFESSOR", "ENCARREGADO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.enrollAluno(req, reply);
  });

  fastify.put("/:id/close", {
    schema: {
      tags: ["Turmas"],
      description: "Fechar turma",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da turma" }
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
    if (!hasRole(req.user.normalizedRoles, "DIRECAO", "PROFESSOR")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.closeTurma(req, reply);
  });

  fastify.put("/:id/archive", {
    schema: {
      tags: ["Turmas"],
      description: "Arquivar turma",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da turma" }
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
    if (!hasRole(req.user.normalizedRoles, "DIRECAO", "PROFESSOR")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.archiveTurma(req, reply);
  });

  fastify.delete("/:id/alunos/:alunoId", {
    schema: {
      tags: ["Turmas"],
      description: "Remover aluno da turma",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da turma" },
          alunoId: { type: "integer", description: "ID do aluno a remover" }
        }
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
    if (!hasRole(req.user.normalizedRoles, "DIRECAO", "PROFESSOR")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.removeAluno(req, reply);
  });

  // === EE + Direção Validation Workflow ===

  // Professor submete grupo para validação dos EE
  fastify.put("/:id/submeter-ee", {
    schema: {
      tags: ["Turmas"],
      description: "Submeter grupo para validação dos Encarregados de Educação",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da turma" }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                message: { type: "string" }
              }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "PROFESSOR")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.submeterParaValidacaoEE(req, reply);
  });

  // EE valida (aceita/rejeita) um aluno específico
  fastify.put("/:id/validar-aluno/:alunoId", {
    schema: {
      tags: ["Turmas"],
      description: "EE valida (aceita/rejeita) um aluno no grupo",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da turma" },
          alunoId: { type: "string", description: "ID do utilizador do aluno" }
        }
      },
      body: {
        type: "object",
        required: ["aceite"],
        properties: {
          aceite: { type: "boolean", description: "true para aceitar, false para rejeitar" },
          motivo: { type: "string", description: "Motivo (obrigatório se rejeitar)" }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                message: { type: "string" },
                status: { type: "string" }
              }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "ENCARREGADO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.validarAlunoEE(req, reply);
  });

  // Listar grupos pendentes de validação do EE logado
  fastify.get("/pendentes-ee", {
    schema: {
      tags: ["Turmas"],
      description: "Listar grupos pendentes de validação do EE logado",
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
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "ENCARREGADO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.getGruposPendentesEE(req, reply);
  });

  // Direção aprova grupo
  fastify.put("/:id/aprovar", {
    schema: {
      tags: ["Turmas"],
      description: "Direção aprova grupo e opcionalmente atribui estúdio",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da turma" }
        }
      },
      body: {
        type: "object",
        properties: {
          estudioAprovadoId: { type: "integer", description: "ID do estúdio aprovado (opcional)" }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                message: { type: "string" },
                status: { type: "string" }
              }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.aprovarDirecao(req, reply);
  });

  // Direção rejeita grupo
  fastify.put("/:id/rejeitar", {
    schema: {
      tags: ["Turmas"],
      description: "Direção rejeita grupo com motivo",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da turma" }
        }
      },
      body: {
        type: "object",
        required: ["motivo"],
        properties: {
          motivo: { type: "string", description: "Motivo da rejeição" }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                message: { type: "string" },
                status: { type: "string" }
              }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.rejeitarDirecao(req, reply);
  });

  // Listar grupos pendentes de aprovação da Direção
  fastify.get("/pendentes-direcao", {
    schema: {
      tags: ["Turmas"],
      description: "Listar grupos pendentes de aprovação da Direção",
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
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.getGruposPendentesDirecao(req, reply);
  });

  // Verificar disponibilidade de estúdio
  fastify.get("/disponibilidade-estudio", {
    schema: {
      tags: ["Turmas"],
      description: "Verificar disponibilidade de um estúdio para um grupo",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        required: ["estudioId"],
        properties: {
          estudioId: { type: "integer", description: "ID do estúdio" },
          dataInicio: { type: "string", description: "Data de início (YYYY-MM-DD)" },
          dataFim: { type: "string", description: "Data de fim (YYYY-MM-DD)" },
          diasSemana: { type: "string", description: "Dias da semana (JSON array)" },
          horaInicio: { type: "string", description: "Hora de início (HH:MM)" },
          horaFim: { type: "string", description: "Hora de fim (HH:MM)" }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                disponivel: { type: "boolean" },
                conflitos: { type: "array" }
              }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
    if (!hasRole(req.user.normalizedRoles, "DIRECAO", "PROFESSOR")) {
      return reply.status(403).send({ success: false, error: "Acesso negado" });
    }
    return turmasController.verificarDisponibilidadeEstudio(req, reply);
  });
}