import prisma from "../config/db.js";
import { createNotificacao } from "./notificacoes.service.js";
import { createAuditLog } from "./audit.service.js";
import { buildNotification } from "../utils/notificationTemplates.js";

const mapGrupo = (g) => ({
  id: String(g.idgrupo),
  nome: g.nomegrupo,
  status: g.status,
  descricao: g.descricao || '',
  modalidade: g.modalidade || '',
  nivel: g.nivel || 'Iniciante',
  faixaEtaria: g.faixaEtaria || '',
  professorId: g.professorId ? String(g.professorId) : '',
  professorNome: '',
  estudioId: g.estudioId ? String(g.estudioId) : '',
  estudioNome: '',
  estudioAprovadoId: g.estudioAprovadoId ? String(g.estudioAprovadoId) : undefined,
  motivoRejeicao: g.motivoRejeicao || undefined,
  diasSemana: g.diasSemana ? (() => { try { return JSON.parse(g.diasSemana); } catch { return []; } })() : [],
  horaInicio: g.horaInicio || '',
  horaFim: g.horaFim || '',
  duracao: g.duracao || 60,
  lotacaoMaxima: g.lotacaoMaxima || 0,
  dataInicio: g.dataInicio || '',
  dataFim: g.dataFim || undefined,
  cor: g.cor || '#5eead4',
  requisitos: g.requisitos || undefined,
  criadaEm: new Date().toISOString(),
  alunosInscritos: (g.alunogrupo || []).map(ag => ({
    alunoId: String(ag.aluno?.utilizadoriduser ?? ag.alunoidaluno),
    alunoNome: ag.aluno?.utilizador?.nome || '',
    encarregadoId: '',
    inscritoEm: new Date().toISOString(),
    statusValidacaoEE: ag.statusValidacaoEE || 'PENDENTE',
  })),
});

export const getAllTurmas = async () => {
  const turmas = await prisma.grupo.findMany({
    include: {
      alunogrupo: {
        include: { aluno: { include: { utilizador: true } } }
      }
    }
  });
  return turmas.map(mapGrupo);
};

export const getTurmaById = async (id) => {
  const turma = await prisma.grupo.findUnique({
    where: { idgrupo: id },
    include: {
      alunogrupo: {
        include: {
          aluno: {
            include: {
              utilizador: true
            }
          }
        }
      }
    }
  });
  return turma;
};

export const createTurma = async (data, userId = null, userNome = '') => {
  const {
    nomegrupo, status, descricao, modalidade, nivel, faixaEtaria,
    professorId, estudioId, diasSemana, horaInicio, horaFim, duracao,
    lotacaoMaxima, dataInicio, dataFim, cor, requisitos
  } = data;

  // Default status is PREENCHIMENTO (draft) for new workflow
  const grupo = await prisma.grupo.create({
    data: {
      nomegrupo,
      status: status || 'PREENCHIMENTO',
      ...(descricao !== undefined && { descricao }),
      ...(modalidade !== undefined && { modalidade }),
      ...(nivel !== undefined && { nivel }),
      ...(faixaEtaria !== undefined && { faixaEtaria }),
      ...(professorId !== undefined && { professorId: parseInt(professorId) }),
      ...(estudioId !== undefined && { estudioId: parseInt(estudioId) }),
      ...(diasSemana !== undefined && { diasSemana: JSON.stringify(diasSemana) }),
      ...(horaInicio !== undefined && { horaInicio }),
      ...(horaFim !== undefined && { horaFim }),
      ...(duracao !== undefined && { duracao: parseInt(duracao) }),
      ...(lotacaoMaxima !== undefined && { lotacaoMaxima: parseInt(lotacaoMaxima) }),
      ...(dataInicio !== undefined && { dataInicio }),
      ...(dataFim !== undefined && { dataFim }),
      ...(cor !== undefined && { cor }),
      ...(requisitos !== undefined && { requisitos }),
    },
    include: { alunogrupo: true }
  });

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'CREATE', 'Grupo', grupo.idgrupo, `Grupo '${nomegrupo}' criado`);

  return grupo;
};

export const updateTurma = async (id, data, userId = null, userNome = '') => {
  const existing = await prisma.grupo.findUnique({ where: { idgrupo: id } });
  if (!existing) throw new Error("Turma não encontrada");

  // Lock status changes once group moves past PREENCHIMENTO
  const lockedStatuses = ['AGUARDA_EE', 'AGUARDA_DIRECAO', 'ATIVA', 'ABERTA', 'REJEITADA', 'FECHADA', 'ARQUIVADA'];
  if (data.status !== undefined && existing.status !== data.status) {
    if (lockedStatuses.includes(existing.status)) {
      throw new Error(`Não é possível alterar o status de um grupo em estado "${existing.status}"`);
    }
  }

  const {
    nomegrupo, status, descricao, modalidade, nivel, faixaEtaria,
    professorId, estudioId, diasSemana, horaInicio, horaFim, duracao,
    lotacaoMaxima, dataInicio, dataFim, cor, requisitos
  } = data;

  const updateData = {};
  if (nomegrupo !== undefined) updateData.nomegrupo = nomegrupo;
  if (status !== undefined) updateData.status = status;
  if (descricao !== undefined) updateData.descricao = descricao;
  if (modalidade !== undefined) updateData.modalidade = modalidade;
  if (nivel !== undefined) updateData.nivel = nivel;
  if (faixaEtaria !== undefined) updateData.faixaEtaria = faixaEtaria;
  if (professorId !== undefined) updateData.professorId = parseInt(professorId);
  if (estudioId !== undefined) updateData.estudioId = parseInt(estudioId);
  if (diasSemana !== undefined) updateData.diasSemana = JSON.stringify(diasSemana);
  if (horaInicio !== undefined) updateData.horaInicio = horaInicio;
  if (horaFim !== undefined) updateData.horaFim = horaFim;
  if (duracao !== undefined) updateData.duracao = parseInt(duracao);
  if (lotacaoMaxima !== undefined) updateData.lotacaoMaxima = parseInt(lotacaoMaxima);
  if (dataInicio !== undefined) updateData.dataInicio = dataInicio;
  if (dataFim !== undefined) updateData.dataFim = dataFim;
  if (cor !== undefined) updateData.cor = cor;
  if (requisitos !== undefined) updateData.requisitos = requisitos;

  const grupo = await prisma.grupo.update({
    where: { idgrupo: id },
    data: updateData,
    include: { alunogrupo: true }
  });

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'UPDATE', 'Grupo', id, 'Grupo atualizado');

  return grupo;
};

export const deleteTurma = async (id) => {
  const existingTurma = await prisma.grupo.findUnique({
    where: { idgrupo: id }
  });

  if (!existingTurma) {
    throw new Error("Turma não encontrada");
  }

  await prisma.alunogrupo.deleteMany({
    where: { grupoidgrupo: id }
  });

  await prisma.grupo.delete({
    where: { idgrupo: id }
  });

  return { message: "Turma eliminada com sucesso" };
};

async function getGrupoIntervenientes(turmaId) {
  const grupo = await prisma.grupo.findUnique({
    where: { idgrupo: turmaId },
    include: {
      alunogrupo: {
        include: {
          aluno: {
            include: {
              encarregadoeducacao: { include: { utilizador: true } },
              utilizador: true,
            }
          }
        }
      }
    }
  });
  if (!grupo) return { professorUserId: null, encarregadoIds: [], nomeGrupo: '' };

  let professorUserId = null;
  if (grupo.professorId) {
    const prof = await prisma.professor.findUnique({ where: { utilizadoriduser: grupo.professorId } });
    if (prof) professorUserId = prof.utilizadoriduser;
  }

  const encarregadoIds = grupo.alunogrupo
    .map(ag => ag.aluno?.encarregadoeducacao?.utilizadoriduser)
    .filter(Boolean);

  return { professorUserId, encarregadoIds: [...new Set(encarregadoIds)], nomeGrupo: grupo.nomegrupo };
}

export const enrollAluno = async (turmaId, alunoId, userId = null, userNome = '') => {
  const turma = await prisma.grupo.findUnique({
    where: { idgrupo: turmaId }
  });

  if (!turma) {
    throw new Error("Turma não encontrada");
  }

  const aluno = await prisma.aluno.findFirst({
    where: {
      OR: [
        { idaluno: alunoId },
        { utilizadoriduser: alunoId }
      ]
    }
  });

  if (!aluno) {
    throw new Error("Aluno não encontrado");
  }

  const existingEnrollment = await prisma.alunogrupo.findFirst({
    where: {
      grupoidgrupo: turmaId,
      alunoidaluno: aluno.idaluno
    }
  });

  if (existingEnrollment) {
    throw new Error("Aluno já matriculado nesta turma");
  }

  const enrollment = await prisma.alunogrupo.create({
    data: {
      grupoidgrupo: turmaId,
      alunoidaluno: aluno.idaluno,
      statusValidacaoEE: 'PENDENTE'
    },
    include: {
      aluno: { include: { utilizador: true, encarregadoeducacao: true } },
      grupo: true
    }
  });

  const nomeGrupo = turma.nomegrupo;
  const alunoNome = enrollment.aluno?.utilizador?.nome || `Aluno #${alunoId}`;

  // Notificar encarregado do aluno inscrito
  const encId = enrollment.aluno?.encarregadoeducacao?.utilizadoriduser;
  if (encId) {
    const notificacao = buildNotification('grupoInscricaoEncarregado', { alunoNome, grupoNome: nomeGrupo });
    await createNotificacao(encId, notificacao.mensagem, notificacao.tipo, turmaId, notificacao.referencia_tipo);
  }

  // Notificar professor do grupo
  if (turma.professorId) {
    const notificacao = buildNotification('grupoInscricaoProfessor', { alunoNome, grupoNome: nomeGrupo });
    await createNotificacao(turma.professorId, notificacao.mensagem, notificacao.tipo, turmaId, notificacao.referencia_tipo);
  }

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'UPDATE', 'Grupo', turmaId, `Aluno inscrito no grupo`);

  return enrollment;
};

export const removeAluno = async (turmaId, userId, auditorUserId = userId, auditorUserNome = '') => {
  const alunoRec = await prisma.aluno.findFirst({
    where: { utilizadoriduser: userId }
  });
  const alunoId = alunoRec ? alunoRec.idaluno : userId;

  const existingEnrollment = await prisma.alunogrupo.findFirst({
    where: { grupoidgrupo: turmaId, alunoidaluno: alunoId }
  });

  if (!existingEnrollment) {
    throw new Error("Aluno não matriculado nesta turma");
  }

  // Keep record but mark as REJEITADO to maintain audit trail (EE workflow)
  await prisma.alunogrupo.update({
    where: { idalunogrupo: existingEnrollment.idalunogrupo },
    data: {
      statusValidacaoEE: 'REJEITADO',
      motivoRejeicaoEE: 'Removido pelo professor',
      dataRespostaEE: new Date()
    }
  });

  // Notificações após remoção
  const grupoInfo = await prisma.grupo.findUnique({ where: { idgrupo: turmaId } });
  const alunoInfo = await prisma.aluno.findUnique({
    where: { idaluno: alunoId },
    include: { utilizador: true, encarregadoeducacao: true }
  });
  const nomeGrupo = grupoInfo?.nomegrupo || `Grupo #${turmaId}`;
  const alunoNome = alunoInfo?.utilizador?.nome || `Aluno #${userId}`;

  const encId = alunoInfo?.encarregadoeducacao?.utilizadoriduser;
  if (encId) {
    const notificacao = buildNotification('grupoRemocaoEncarregado', { alunoNome, grupoNome: nomeGrupo });
    await createNotificacao(encId, notificacao.mensagem, notificacao.tipo, turmaId, notificacao.referencia_tipo);
  }
  if (grupoInfo?.professorId) {
    const notificacao = buildNotification('grupoRemocaoProfessor', { alunoNome, grupoNome: nomeGrupo });
    await createNotificacao(grupoInfo.professorId, notificacao.mensagem, notificacao.tipo, turmaId, notificacao.referencia_tipo);
  }

  try {
    await createAuditLog(parseInt(auditorUserId) || null, auditorUserNome, 'UPDATE', 'Grupo', turmaId, `Aluno removido do grupo`);
  } catch (_) {}

  return { message: "Aluno removido da turma com sucesso" };
};

export const closeTurma = async (id, userId = null, userNome = '') => {
  const turma = await prisma.grupo.findUnique({ where: { idgrupo: id } });
  if (!turma) throw new Error("Turma não encontrada");
  // Treat ATIVA and ABERTA as equivalent for toggle purposes
  const isOpen = turma.status === 'ABERTA' || turma.status === 'ATIVA';
  const newStatus = isOpen ? 'FECHADA' : (turma.status === 'FECHADA' ? 'ATIVA' : turma.status);
  const updated = await prisma.grupo.update({ where: { idgrupo: id }, data: { status: newStatus } });

  const { professorUserId, encarregadoIds, nomeGrupo } = await getGrupoIntervenientes(id);
  if (newStatus === 'FECHADA') {
    if (professorUserId) {
      const notificacao = buildNotification('grupoEstado', { grupoNome: nomeGrupo, estado: 'FECHADO' });
      await createNotificacao(professorUserId, notificacao.mensagem, notificacao.tipo, id, notificacao.referencia_tipo);
    }
    for (const encId of encarregadoIds) {
      const notificacao = buildNotification('grupoEstado', { grupoNome: nomeGrupo, estado: 'FECHADO', destinatario: 'encarregado' });
      await createNotificacao(encId, notificacao.mensagem, notificacao.tipo, id, notificacao.referencia_tipo);
    }
  } else {
    if (professorUserId) {
      const notificacao = buildNotification('grupoEstado', { grupoNome: nomeGrupo, estado: 'ABERTO' });
      await createNotificacao(professorUserId, notificacao.mensagem, notificacao.tipo, id, notificacao.referencia_tipo);
    }
  }

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'UPDATE', 'Grupo', id, `Grupo ${newStatus === 'FECHADA' ? 'fechado' : 'reaberto'}`);

  return updated;
};

export const archiveTurma = async (id, userId = null, userNome = '') => {
  const turma = await prisma.grupo.findUnique({ where: { idgrupo: id } });
  if (!turma) throw new Error("Turma não encontrada");
  const updated = await prisma.grupo.update({ where: { idgrupo: id }, data: { status: 'ARQUIVADA' } });

  const { professorUserId, encarregadoIds, nomeGrupo } = await getGrupoIntervenientes(id);
  if (professorUserId) {
    const notificacao = buildNotification('grupoEstado', { grupoNome: nomeGrupo, estado: 'ARQUIVADO' });
    await createNotificacao(professorUserId, notificacao.mensagem, notificacao.tipo, id, notificacao.referencia_tipo);
  }
  for (const encId of encarregadoIds) {
    const notificacao = buildNotification('grupoEstado', { grupoNome: nomeGrupo, estado: 'ARQUIVADO', destinatario: 'encarregado' });
    await createNotificacao(encId, notificacao.mensagem, notificacao.tipo, id, notificacao.referencia_tipo);
  }

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'UPDATE', 'Grupo', id, 'Grupo arquivado');

  return updated;
};

// ========== EE + Direção Validation Workflow ==========

/**
 * Professor submits a group for EE validation.
 * Transitions status from PREENCHIMENTO to AGUARDA_EE.
 */
export const submeterParaValidacaoEE = async (turmaId, userId = null, userNome = '') => {
  const grupo = await prisma.grupo.findUnique({
    where: { idgrupo: parseInt(turmaId) },
    include: {
      alunogrupo: {
        include: {
          aluno: { include: { utilizador: true, encarregadoeducacao: { include: { utilizador: true } } } }
        }
      }
    }
  });
  if (!grupo) throw new Error('Grupo não encontrado');
  if (grupo.status !== 'PREENCHIMENTO') throw new Error('Grupo não está em estado de preenchimento');

  if (grupo.alunogrupo.length === 0) throw new Error('Grupo precisa ter pelo menos um aluno inscrito');

  await prisma.grupo.update({
    where: { idgrupo: parseInt(turmaId) },
    data: { status: 'AGUARDA_EE' }
  });

  // Notify each EE that has a student in this group
  for (const ag of grupo.alunogrupo) {
    const encId = ag.aluno?.encarregadoeducacao?.utilizadoriduser;
    const alunoNome = ag.aluno?.utilizador?.nome || 'Aluno';
    if (encId) {
      const notificacao = buildNotification('grupoSubmetidoEE', { grupoNome: grupo.nomegrupo, alunoNome });
      await createNotificacao(encId, notificacao.mensagem, notificacao.tipo, grupo.idgrupo, notificacao.referencia_tipo);
    }
  }

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'UPDATE', 'Grupo', grupo.idgrupo, 'Grupo submetido para validação EE');

  return { message: 'Grupo submetido para validação dos Encarregados de Educação' };
};

/**
 * EE validates (accepts or rejects) a specific student in a group.
 */
export const validarAlunoEE = async (turmaId, alunoUtilizadorId, aceite, motivo = '', userId = null, userNome = '') => {
  const grupo = await prisma.grupo.findUnique({
    where: { idgrupo: parseInt(turmaId) }
  });
  if (!grupo) throw new Error('Grupo não encontrado');
  if (grupo.status !== 'AGUARDA_EE') throw new Error('Grupo não está a aguardar validação EE');

  const aluno = await prisma.aluno.findFirst({
    where: { utilizadoriduser: alunoUtilizadorId }
  });
  if (!aluno) throw new Error('Aluno não encontrado');

  const enrollment = await prisma.alunogrupo.findFirst({
    where: {
      grupoidgrupo: parseInt(turmaId),
      alunoidaluno: aluno.idaluno
    },
    include: {
      aluno: { include: { utilizador: true, encarregadoeducacao: { include: { utilizador: true } } } }
    }
  });
  if (!enrollment) throw new Error('Aluno não está inscrito neste grupo');
  if (enrollment.statusValidacaoEE !== 'PENDENTE') throw new Error('Este aluno já foi validado/rejeitado');

  const newStatus = aceite ? 'ACEITE' : 'REJEITADO';
  await prisma.alunogrupo.update({
    where: { idalunogrupo: enrollment.idalunogrupo },
    data: {
      statusValidacaoEE: newStatus,
      dataRespostaEE: new Date(),
      ...(motivo ? { motivoRejeicaoEE: motivo } : {})
    }
  });

  const alunoNome = enrollment.aluno?.utilizador?.nome || 'Aluno';

  // Notify professor
  if (grupo.professorId) {
    const templateKey = aceite ? 'grupoEEAceiteProfessor' : 'grupoERejeitadoProfessor';
    const params = { grupoNome: grupo.nomegrupo, alunoNome };
    if (!aceite && motivo) params.motivo = motivo;
    const notificacao = buildNotification(templateKey, params);
    await createNotificacao(grupo.professorId, notificacao.mensagem, notificacao.tipo, grupo.idgrupo, notificacao.referencia_tipo);
  }

  // Notify direcao if rejected
  if (!aceite) {
    const dirTemplateKey = 'grupoERejeitadoDirecao';
    const dirParams = { grupoNome: grupo.nomegrupo, alunoNome };
    if (motivo) dirParams.motivo = motivo;
    // Find direcao users to notify
    const direcoes = await prisma.direcao.findMany({ include: { utilizador: true } });
    for (const d of direcoes) {
      const notificacao = buildNotification(dirTemplateKey, dirParams);
      await createNotificacao(d.utilizadoriduser, notificacao.mensagem, notificacao.tipo, grupo.idgrupo, notificacao.referencia_tipo);
    }
  }

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'UPDATE', 'Grupo', grupo.idgrupo, `EE ${aceite ? 'aceitou' : 'rejeitou'} aluno ${alunoNome}`);

  // Auto-check if all students have responded
  await verificarStatusGrupo(parseInt(turmaId));

  return { message: `Aluno ${aceite ? 'aceite' : 'rejeitado'} com sucesso`, status: newStatus };
};

/**
 * Check if all students have responded to EE validation.
 * If all accepted, auto-advance to AGUARDA_DIRECAO.
 * If any rejected, stays in AGUARDA_EE (professor can manage).
 */
const verificarStatusGrupo = async (turmaId) => {
  const enrollments = await prisma.alunogrupo.findMany({
    where: { grupoidgrupo: turmaId }
  });

  if (enrollments.length === 0) return;

  const allResponded = enrollments.every(ag => ag.statusValidacaoEE !== 'PENDENTE');
  if (!allResponded) return;

  const anyRejected = enrollments.some(ag => ag.statusValidacaoEE === 'REJEITADO');
  if (!anyRejected) {
    // All accepted -> advance to direction approval
    const grupo = await prisma.grupo.update({
      where: { idgrupo: turmaId },
      data: { status: 'AGUARDA_DIRECAO' }
    });

    // Notify direcao
    const notificacao = buildNotification('grupoSubmetidoDirecao', { grupoNome: grupo.nomegrupo });
    const direcoes = await prisma.direcao.findMany({ include: { utilizador: true } });
    for (const d of direcoes) {
      await createNotificacao(d.utilizadoriduser, notificacao.mensagem, notificacao.tipo, grupo.idgrupo, notificacao.referencia_tipo);
    }

    // Notify professor
    if (grupo.professorId) {
      await createNotificacao(grupo.professorId, notificacao.mensagem, notificacao.tipo, grupo.idgrupo, notificacao.referencia_tipo);
    }
  }
};

/**
 * Get groups pending EE validation for a specific EE user.
 */
export const getGruposPendentesEE = async (userId) => {
  const aluno = await prisma.aluno.findFirst({
    where: { utilizadoriduser: userId }
  });
  if (!aluno) return [];

  const enrollments = await prisma.alunogrupo.findMany({
    where: {
      alunoidaluno: aluno.idaluno,
      statusValidacaoEE: 'PENDENTE',
      grupo: { status: 'AGUARDA_EE' }
    },
    include: {
      grupo: {
        include: {
          alunogrupo: {
            include: { aluno: { include: { utilizador: true } } }
          }
        }
      }
    }
  });

  return enrollments.map(e => ({
    ...mapGrupo(e.grupo),
    alunosPorValidar: e.grupo.alunogrupo
      .filter(ag => ag.statusValidacaoEE === 'PENDENTE')
      .map(ag => ({
        alunoId: String(ag.aluno?.utilizadoriduser ?? ag.alunoidaluno),
        alunoNome: ag.aluno?.utilizador?.nome || '',
      }))
  }));
};

/**
 * Direction approves the group (with optional studio assignment).
 * Transitions status from AGUARDA_DIRECAO to ATIVA.
 */
export const aprovarDirecao = async (turmaId, estudioAprovadoId = null, userId = null, userNome = '') => {
  const grupo = await prisma.grupo.findUnique({
    where: { idgrupo: parseInt(turmaId) },
    include: {
      alunogrupo: {
        include: {
          aluno: { include: { utilizador: true, encarregadoeducacao: { include: { utilizador: true } } } }
        }
      }
    }
  });
  if (!grupo) throw new Error('Grupo não encontrado');
  if (grupo.status !== 'AGUARDA_DIRECAO') throw new Error('Grupo não está a aguardar aprovação da Direção');

  const updateData = { status: 'ATIVA' };
  if (estudioAprovadoId) {
    updateData.estudioAprovadoId = parseInt(estudioAprovadoId);
  }

  await prisma.grupo.update({
    where: { idgrupo: parseInt(turmaId) },
    data: updateData
  });

  // Look up estudio name for notification
  let estudioNome = '';
  if (estudioAprovadoId) {
    const estudio = await prisma.sala.findUnique({ where: { idsala: parseInt(estudioAprovadoId) } });
    estudioNome = estudio?.nome || '';
  }

  // Notify professor
  if (grupo.professorId) {
    const notificacao = buildNotification('grupoAprovadoDirecaoProfessor', { grupoNome: grupo.nomegrupo, estudioNome });
    await createNotificacao(grupo.professorId, notificacao.mensagem, notificacao.tipo, grupo.idgrupo, notificacao.referencia_tipo);
  }

  // Notify each EE
  for (const ag of grupo.alunogrupo) {
    const encId = ag.aluno?.encarregadoeducacao?.utilizadoriduser;
    const alunoNome = ag.aluno?.utilizador?.nome || 'Aluno';
    if (encId) {
      const notificacao = buildNotification('grupoAprovadoDirecaoEE', { grupoNome: grupo.nomegrupo, alunoNome, estudioNome });
      await createNotificacao(encId, notificacao.mensagem, notificacao.tipo, grupo.idgrupo, notificacao.referencia_tipo);
    }
  }

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'UPDATE', 'Grupo', grupo.idgrupo, 'Grupo aprovado pela Direção');

  return { message: 'Grupo aprovado pela Direção', status: 'ATIVA' };
};

/**
 * Direction rejects the group.
 * Transitions status from AGUARDA_DIRECAO to REJEITADA.
 */
export const rejeitarDirecao = async (turmaId, motivo, userId = null, userNome = '') => {
  if (!motivo) throw new Error('É obrigatório indicar o motivo da rejeição');

  const grupo = await prisma.grupo.findUnique({
    where: { idgrupo: parseInt(turmaId) },
    include: {
      alunogrupo: {
        include: {
          aluno: { include: { utilizador: true, encarregadoeducacao: { include: { utilizador: true } } } }
        }
      }
    }
  });
  if (!grupo) throw new Error('Grupo não encontrado');
  if (grupo.status !== 'AGUARDA_DIRECAO') throw new Error('Grupo não está a aguardar aprovação da Direção');

  await prisma.grupo.update({
    where: { idgrupo: parseInt(turmaId) },
    data: { status: 'REJEITADA', motivoRejeicao: motivo }
  });

  // Notify professor
  if (grupo.professorId) {
    const notificacao = buildNotification('grupoRejeitadoDirecaoProfessor', { grupoNome: grupo.nomegrupo, motivo });
    await createNotificacao(grupo.professorId, notificacao.mensagem, notificacao.tipo, grupo.idgrupo, notificacao.referencia_tipo);
  }

  // Notify each EE
  for (const ag of grupo.alunogrupo) {
    const encId = ag.aluno?.encarregadoeducacao?.utilizadoriduser;
    const alunoNome = ag.aluno?.utilizador?.nome || 'Aluno';
    if (encId) {
      const notificacao = buildNotification('grupoRejeitadoDirecaoEE', { grupoNome: grupo.nomegrupo, alunoNome, motivo });
      await createNotificacao(encId, notificacao.mensagem, notificacao.tipo, grupo.idgrupo, notificacao.referencia_tipo);
    }
  }

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'UPDATE', 'Grupo', grupo.idgrupo, 'Grupo rejeitado pela Direção');

  return { message: 'Grupo rejeitado pela Direção', status: 'REJEITADA' };
};

/**
 * Get groups pending direction approval.
 */
export const getGruposPendentesDirecao = async () => {
  const grupos = await prisma.grupo.findMany({
    where: { status: 'AGUARDA_DIRECAO' },
    include: {
      alunogrupo: {
        include: { aluno: { include: { utilizador: true } } }
      }
    }
  });

  return grupos.map(g => ({
    ...mapGrupo(g),
    alunosAceites: g.alunogrupo
      .filter(ag => ag.statusValidacaoEE === 'ACEITE')
      .map(ag => ({
        alunoId: String(ag.aluno?.utilizadoriduser ?? ag.alunoidaluno),
        alunoNome: ag.aluno?.utilizador?.nome || '',
      })),
    totalAlunos: g.alunogrupo.length
  }));
};

/**
 * Check if a studio (sala) is available for the given time slots.
 */
export const verificarDisponibilidadeEstudio = async (estudioId, dataInicio, dataFim, diasSemana, horaInicio, horaFim) => {
  const conflicts = await prisma.grupo.findMany({
    where: {
      OR: [
        { estudioId: parseInt(estudioId) },
        { estudioAprovadoId: parseInt(estudioId) }
      ],
      status: { in: ['AGUARDA_DIRECAO', 'ATIVA', 'ABERTA'] },
      ...(dataInicio ? { dataInicio } : {}),
      ...(dataFim ? { dataFim } : {}),
      horaInicio,
      horaFim
    }
  });

  return {
    disponivel: conflicts.length === 0,
    conflitos: conflicts.map(c => ({
      id: String(c.idgrupo),
      nome: c.nomegrupo,
      status: c.status,
      horaInicio: c.horaInicio,
      horaFim: c.horaFim
    }))
  };
};
