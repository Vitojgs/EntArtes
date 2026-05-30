import prisma from "../config/db.js";
import { createNotificacao } from "./notificacoes.service.js";
import { createAuditLog } from "./audit.service.js";
import { buildNotification } from "../utils/notificationTemplates.js";

async function notificarTodosUtilizadores(mensagem, tipo, referenciaId = null, referenciaTipo = null) {
  const users = await prisma.utilizador.findMany({ select: { iduser: true } });
  await Promise.all(users.map(u => createNotificacao(u.iduser, mensagem, tipo, referenciaId, referenciaTipo)));
}

const mapEvento = (e) => ({
  id: String(e.idevento),
  titulo: e.titulo,
  descricao: e.descricao || '',
  tipo: e.tipo || null,
  hora: e.hora || null,
  data: e.datas && e.datas.length > 0 ? e.datas.map(d => d.dataevento.toISOString().split('T')[0]).sort() : [],
  datafim: e.datafim ? e.datafim.toISOString().split('T')[0] : null,
  local: e.localizacao || '',
  imagem: e.imagem || '',
  linkBilhetes: e.linkbilhetes || '',
  publicado: e.publicado,
  destaque: e.destaque,
  datacriacao: e.datacriacao,
  criadopor: e.direcaoutilizadoriduser ? String(e.direcaoutilizadoriduser) : null,
});

export const getAllEventos = async () => {
  const eventos = await prisma.evento.findMany({
    include: { datas: { orderBy: { dataevento: 'asc' } } },
    orderBy: { datacriacao: 'desc' }
  });
  // Sort by earliest event date, then by creation date (desc) as tiebreaker
  const sorted = eventos.sort((a, b) => {
    const aDate = a.datas?.[0]?.dataevento || a.datacriacao;
    const bDate = b.datas?.[0]?.dataevento || b.datacriacao;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
  return sorted.map(mapEvento);
};

export const getEventoById = async (id) => {
  const evento = await prisma.evento.findUnique({ 
    where: { idevento: id },
    include: { datas: true }
  });
  return evento ? mapEvento(evento) : null;
};

export const createEvento = async (data, userId, userNome = '') => {
  const { titulo, descricao, datas, datafim, local, imagem, linkBilhetes, destaque, publicado } = data;
  const isPublicado = publicado === true || publicado === 'true';
  
  const evento = await prisma.evento.create({
    data: {
      titulo,
      descricao: descricao || '',
      tipo: data.tipo || null,
      hora: data.hora || null,
      datafim: datafim ? new Date(datafim) : null,
      localizacao: local || '',
      imagem: imagem || '',
      linkbilhetes: linkBilhetes || '',
      destaque: destaque === true || destaque === 'true',
      publicado: isPublicado,
      direcaoutilizadoriduser: userId ? parseInt(userId) : null,
      datas: datas && datas.length > 0 ? {
        create: datas.map(d => ({ dataevento: new Date(d) }))
      } : undefined
    },
    include: { datas: true }
  });
  
  if (isPublicado && evento.datas && evento.datas.length > 0) {
    const datasStr = evento.datas.map(d => new Date(d.dataevento).toLocaleDateString('pt-PT')).join(', ');
    const notificacao = buildNotification('eventoPublicado', { titulo, datas: datasStr });
    await notificarTodosUtilizadores(notificacao.mensagem, notificacao.tipo, evento.idevento, notificacao.referencia_tipo);
  }

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'CREATE', 'Evento', evento.idevento, `Evento '${titulo}' criado`);

  return mapEvento(evento);
};

export const updateEvento = async (id, data, userId = null, userNome = '') => {
  const exists = await prisma.evento.findUnique({ where: { idevento: id } });
  if (!exists) throw new Error("Evento não encontrado");

  const updateData = {};
  if (data.titulo !== undefined) updateData.titulo = data.titulo;
  if (data.descricao !== undefined) updateData.descricao = data.descricao;
  if (data.tipo !== undefined) updateData.tipo = data.tipo || null;
  if (data.hora !== undefined) updateData.hora = data.hora || null;
  if (data.datafim !== undefined) updateData.datafim = data.datafim ? new Date(data.datafim) : null;
  if (data.local !== undefined) updateData.localizacao = data.local;
  if (data.imagem !== undefined) updateData.imagem = data.imagem;
  if (data.linkBilhetes !== undefined) updateData.linkbilhetes = data.linkBilhetes;
  if (data.destaque !== undefined) updateData.destaque = data.destaque === true || data.destaque === 'true';
  if (data.publicado !== undefined) updateData.publicado = data.publicado === true || data.publicado === 'true';

  // Atualizar datas se fornecidas
  if (data.datas !== undefined) {
    await prisma.eventoData.deleteMany({ where: { eventoidevento: id } });
    if (data.datas && data.datas.length > 0) {
      await prisma.eventoData.createMany({
        data: data.datas.map(d => ({ dataevento: new Date(d), eventoidevento: id }))
      });
    }
  }

  const evento = await prisma.evento.update({ where: { idevento: id }, data: updateData, include: { datas: true } });

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'UPDATE', 'Evento', parseInt(id), 'Evento atualizado');

  return mapEvento(evento);
};

export const deleteEvento = async (id, userId = null, userNome = '') => {
  const exists = await prisma.evento.findUnique({ where: { idevento: id } });
  if (!exists) throw new Error("Evento não encontrado");
  await prisma.evento.delete({ where: { idevento: id } });

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'DELETE', 'Evento', parseInt(id), 'Evento removido');

  return { message: "Evento eliminado com sucesso" };
};

export const publishEvento = async (id, userId = null, userNome = '') => {
  const exists = await prisma.evento.findUnique({ 
    where: { idevento: id },
    include: { datas: true }
  });
  if (!exists) throw new Error("Evento não encontrado");
  const isPublishing = !exists.publicado;
  const evento = await prisma.evento.update({
    where: { idevento: id },
    data: { publicado: !exists.publicado },
    include: { datas: true }
  });
  
  if (evento.datas && evento.datas.length > 0) {
    const dataStr = evento.datas.map(d => new Date(d.dataevento).toLocaleDateString('pt-PT')).join(', ');
    const notificacao = buildNotification('eventoPublicado', { titulo: exists.titulo, datas: dataStr });
    await notificarTodosUtilizadores(notificacao.mensagem, notificacao.tipo, parseInt(id), notificacao.referencia_tipo);
  }

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'UPDATE', 'Evento', parseInt(id), isPublishing ? 'Evento publicado' : 'Evento despublicado');

  return mapEvento(evento);
};
