import prisma from "../config/db.js";
import { createAuditLog } from "./audit.service.js";
import { buildNotification } from "../utils/notificationTemplates.js";

const transacaoInclude = {
  estado: true,
  anuncio: { 
    include: { 
      figurino: { 
        include: { 
          tamanho: true, 
          cor: true, 
          genero: true, 
          itemfigurino: true, 
          modelofigurino: { include: { tipofigurino: true } } 
        } 
      } 
    } 
  },
  itemfigurino: true,
  direcao: { include: { utilizador: true } },
  encarregadoeducacao: { include: { utilizador: true } },
  professor: { include: { utilizador: true } },
};

export const getAllTransacoes = async () => {
  const transacoes = await prisma.transacaofigurino.findMany({ include: transacaoInclude });
  
  return transacoes.map(t => {
    const requerenteId = t.encarregadoeducacaoutilizadoriduser 
      ? String(t.encarregadoeducacaoutilizadoriduser)
      : t.professorutilizadoriduser 
        ? String(t.professorutilizadoriduser)
        : String(t.direcaoutilizadoriduser);
    
    const requerenteNome = t.encarregadoeducacao?.utilizador?.nome 
      || t.professor?.utilizador?.nome 
      || t.direcao?.utilizador?.nome 
      || 'Desconhecido';
    
    const figurinoNome = t.anuncio?.figurino?.modelofigurino?.nomemodelo 
      || t.anuncio?.figurino?.nomemodelo 
      || 'Figurino';
    
    return {
      id: String(t.idtransacao),
      anunciosId: String(t.anuncioidanuncio),
      anunciosTitulo: figurinoNome,
      usuarioId: requerenteId,
      usuarioNome: requerenteNome,
      dataInicio: t.datainicio ? t.datainicio.toISOString() : t.datatransacao.toISOString(),
      dataFim: t.datafim ? t.datafim.toISOString() : t.datatransacao.toISOString(),
      status: t.estado?.tipoestado || 'Pendente',
      createdAt: t.datatransacao.toISOString(),
      figurinoNome: figurinoNome,
      figurinoTamanho: t.anuncio?.figurino?.tamanho?.nometamanho || '',
      figurinoCor: t.anuncio?.figurino?.cor?.nomecor || '',
      figurinoGenero: t.anuncio?.figurino?.genero?.nomegenero || '',
      figurinoTipo: t.anuncio?.figurino?.modelofigurino?.tipofigurino?.tipofigurino || '',
      figurinoQuantidade: t.quantidade,
      figurinoLocalizacao: t.anuncio?.figurino?.itemfigurino?.localizacao || '',
      valorAluguer: t.anuncio?.valor,
      figurinoId: t.anuncio?.figurinoidfigurino,
      motivorejeicao: t.motivorejeicao || null,
    };
  });
};

export const getTransacaoById = async (id) => {
  return prisma.transacaofigurino.findUnique({
    where: { idtransacao: parseInt(id) },
    include: transacaoInclude,
  });
};

export const getTransacoesByAnuncio = async (anuncioId) => {
  return prisma.transacaofigurino.findMany({
    where: { anuncioidanuncio: parseInt(anuncioId) },
    include: transacaoInclude,
  });
};

export const registarTransacao = async (data, userId = null, userNome = '') => {
  const {
    quantidade,
    datatransacao,
    datainicio,
    datafim,
    anuncioidanuncio,
    estadoidestado,
    itemfigurinoiditem,
    encarregadoeducacaoutilizadoriduser,
    professorutilizadoriduser,
  } = data;

  if (!encarregadoeducacaoutilizadoriduser && !professorutilizadoriduser) {
    throw new Error("É necessário identificar o requerente (encarregado ou professor)");
  }
  
  const agora = new Date();
  const dataHojeStr = agora.toISOString().split('T')[0];
  
  if (datainicio) {
    const dataInicioStr = new Date(datainicio).toISOString().split('T')[0];
    if (dataInicioStr < dataHojeStr) {
      throw new Error('A data de início não pode ser no passado');
    }
  }
  
  if (datainicio && datafim) {
    const dataInicioObj = new Date(datainicio);
    const dataFimObj = new Date(datafim);
    if (dataFimObj <= dataInicioObj) {
      throw new Error('A data de fim deve ser posterior à data de início');
    }
  }

  const anuncio = await prisma.anuncio.findUnique({
    where: { idanuncio: parseInt(anuncioidanuncio) },
    include: { figurino: true },
  });

  if (!anuncio) {
    throw new Error("Anúncio não encontrado");
  }

  // Dynamic stock check: validate against period-based availability
  const { getDisponibilidadeFigurino } = await import("./colecoes.service.js");
  const dataInicioStr = datainicio || new Date().toISOString().split('T')[0];
  const dataFimStr = datafim || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })();

  const disponibilidade = await getDisponibilidadeFigurino(
    anuncio.figurinoidfigurino,
    dataInicioStr,
    dataFimStr
  );

  if (!disponibilidade || disponibilidade.disponivel <= 0) {
    const msg = disponibilidade?.proximaDataDisponivel
      ? `Figurino sem stock disponível para este período. Próxima disponibilidade: ${disponibilidade.proximaDataDisponivel}`
      : 'Figurino sem stock disponível para este período';
    throw new Error(msg);
  }

  if (parseInt(quantidade) > disponibilidade.disponivel) {
    throw new Error(
      `Apenas ${disponibilidade.disponivel} unidade(s) disponível(is)`);
  }

  let resolvedEstadoId = estadoidestado ? parseInt(estadoidestado) : null;
  if (!resolvedEstadoId || isNaN(resolvedEstadoId)) {
    const pendente = await prisma.estado.findFirst({
      where: { tipoestado: { equals: 'Pendente', mode: 'insensitive' } },
    });
    resolvedEstadoId = pendente?.idestado ?? 21;
  }

  const transacao = await prisma.transacaofigurino.create({
    data: {
      quantidade: parseInt(quantidade),
      datatransacao: datatransacao ? new Date(datatransacao) : agora,
      datainicio: datainicio ? new Date(datainicio) : null,
      datafim: datafim ? new Date(datafim) : null,
      anuncioidanuncio: parseInt(anuncioidanuncio),
      estadoidestado: resolvedEstadoId,
      itemfigurinoiditem: itemfigurinoiditem ? parseInt(itemfigurinoiditem) : null,
      encarregadoeducacaoutilizadoriduser: encarregadoeducacaoutilizadoriduser
        ? parseInt(encarregadoeducacaoutilizadoriduser)
        : null,
      professorutilizadoriduser: professorutilizadoriduser
        ? parseInt(professorutilizadoriduser)
        : null,
    },
    include: transacaoInclude,
  });

  await criarNotificacaoReserva(transacao.idtransacao, anuncioidanuncio);

  await createAuditLog(userId ? parseInt(userId) : null, userNome, 'CREATE', 'TransacaoFigurino', transacao.idtransacao, 'Reserva de figurino criada');

  return transacao;
};

export const avaliarPedidoReserva = async (id, novoEstadoId, direcaoUserId, direcaoUserNome = '', motivorejeicao) => {
  const transacao = await prisma.transacaofigurino.update({
    where: { idtransacao: parseInt(id) },
    data: {
      estadoidestado: parseInt(novoEstadoId),
      ...(direcaoUserId && { direcaoutilizadoriduser: parseInt(direcaoUserId) }),
      ...(motivorejeicao !== undefined && { motivorejeicao: motivorejeicao || null }),
    },
    include: { ...transacaoInclude, estado: true },
  });

  await criarNotificacaoStatus(transacao);

  const novoEstadoStr = (transacao.estado?.tipoestado || '').toLowerCase();

  // Stock é calculado dinamicamente por getDisponibilidadeFigurino
  // com base nas transacções Pendente/Aprovado — não necessário decrement manual

  try {
    await createAuditLog(direcaoUserId ? parseInt(direcaoUserId) : null, direcaoUserNome || 'Direção', 'UPDATE', 'TransacaoFigurino', parseInt(id), `Estado atualizado para ${transacao.estado?.tipoestado || novoEstadoStr}`);
  } catch (_) {}

  return transacao;
};

export const confirmarReserva = async (id, userId) => {
  const transacao = await prisma.transacaofigurino.findUnique({
    where: { idtransacao: parseInt(id) },
  });
  if (!transacao) throw new Error('Reserva não encontrada');

  const estadoAprovado = await prisma.estado.findFirst({
    where: { tipoestado: { equals: 'Aprovado', mode: 'insensitive' } },
  });
  if (!estadoAprovado) throw new Error('Estado Aprovado não encontrado');

  if (transacao.estadoidestado !== estadoAprovado.idestado) {
    throw new Error('A reserva precisa estar aprovada para ser confirmada');
  }

  const isRequester = transacao.encarregadoeducacaoutilizadoriduser == userId
    || transacao.professorutilizadoriduser == userId;
  if (!isRequester) {
    throw new Error('Não tem permissão para confirmar esta reserva');
  }

  const estadoConfirmado = await prisma.estado.findFirst({
    where: { tipoestado: { equals: 'Confirmado', mode: 'insensitive' } },
  });
  if (!estadoConfirmado) throw new Error('Estado Confirmado não encontrado');

  const updated = await prisma.transacaofigurino.update({
    where: { idtransacao: parseInt(id) },
    data: { estadoidestado: estadoConfirmado.idestado },
    include: transacaoInclude,
  });

  if (transacao.anuncioidanuncio && transacao.anuncio?.figurinoidfigurino) {
    // Only mark as ALUGADO in Stock if the ad was created by DIRECAO
    const anuncio = await prisma.anuncio.findUnique({
      where: { idanuncio: transacao.anuncioidanuncio },
    });

  }

  return updated;
};

export const cancelarReserva = async (id, userId, motivo) => {
  const transacao = await prisma.transacaofigurino.findUnique({
    where: { idtransacao: parseInt(id) },
    include: { anuncio: true },
  });
  if (!transacao) throw new Error('Reserva não encontrada');

  const isRequester = transacao.encarregadoeducacaoutilizadoriduser == userId
    || transacao.professorutilizadoriduser == userId;
  const isDirecao = await prisma.direcao.findFirst({
    where: { utilizadoriduser: parseInt(userId) },
  });
  if (!isRequester && !isDirecao) {
    throw new Error('Não tem permissão para cancelar esta reserva');
  }

  const estadoCancelado = await prisma.estado.findFirst({
    where: { tipoestado: { equals: 'Cancelado', mode: 'insensitive' } },
  });
  if (!estadoCancelado) throw new Error('Estado Cancelado não encontrado');

  // Stock é calculado dinamicamente por getDisponibilidadeFigurino
  // com base nas transacções Pendente/Aprovado — ao cancelar, a transacção
  // deixa de contar como reservada, libertando stock automaticamente

  return prisma.transacaofigurino.update({
    where: { idtransacao: parseInt(id) },
    data: {
      estadoidestado: estadoCancelado.idestado,
      ...(motivo && { motivorejeicao: motivo }),
    },
    include: transacaoInclude,
  });
};

export const devolverAluguer = async (id) => {
  const transacao = await prisma.transacaofigurino.findUnique({
    where: { idtransacao: parseInt(id) },
    include: { anuncio: true },
  });
  if (!transacao) throw new Error('Transação não encontrada');

  const estadoConcluido = await prisma.estado.findFirst({
    where: { tipoestado: { equals: 'Concluído', mode: 'insensitive' } },
  });
  if (!estadoConcluido) throw new Error('Estado Concluído não encontrado');

  const updated = await prisma.transacaofigurino.update({
    where: { idtransacao: parseInt(id) },
    data: { estadoidestado: estadoConcluido.idestado },
    include: transacaoInclude,
  });

  // Stock é calculado dinamicamente por getDisponibilidadeFigurino
  // com base nas transacções Pendente/Aprovado — ao concluir, a transacção
  // deixa de contar como reservada, libertando stock automaticamente

  return updated;
};

export const deleteTransacao = async (id) => {
  return prisma.transacaofigurino.delete({
    where: { idtransacao: parseInt(id) },
  });
};

export const getDisponibilidadeFigurino = async (anuncioId) => {
  const anuncio = await prisma.anuncio.findUnique({
    where: { idanuncio: parseInt(anuncioId) },
    include: { figurino: true }
  });
  
  if (!anuncio) {
    throw new Error("Anúncio não encontrado");
  }
  
  const estadosAtivos = await prisma.estado.findMany({
    where: { tipoestado: { in: ['Pendente', 'Aprovado'], mode: 'insensitive' } },
  });
  const estadoIdsAtivos = estadosAtivos.map(e => e.idestado);

  const totalReservado = await prisma.transacaofigurino.aggregate({
    where: {
      anuncioidanuncio: parseInt(anuncioId),
      estadoidestado: { in: estadoIdsAtivos },
    },
    _sum: { quantidade: true }
  });
  
  return {
    total: anuncio.quantidade,
    reservado: totalReservado._sum.quantidade || 0,
    disponivel: anuncio.quantidade - (totalReservado._sum.quantidade || 0)
  };
};

export const getReservasByUser = async (userId, role) => {
  const where =
    role === 'PROFESSOR'
      ? { professorutilizadoriduser: parseInt(userId) }
      : { encarregadoeducacaoutilizadoriduser: parseInt(userId) };

  const transacoes = await prisma.transacaofigurino.findMany({
    where,
    include: transacaoInclude,
  });
  
  return transacoes.map(t => {
    const requerenteNome = t.encarregadoeducacao?.utilizador?.nome 
      || t.professor?.utilizador?.nome 
      || t.direcao?.utilizador?.nome 
      || 'Desconhecido';
    
    const figurinoNome = t.anuncio?.figurino?.modelofigurino?.nomemodelo 
      || t.anuncio?.figurino?.nomemodelo 
      || 'Figurino';
    
    return {
      id: String(t.idtransacao),
      anunciosId: String(t.anuncioidanuncio),
      anunciosTitulo: figurinoNome,
      usuarioId: String(userId),
      usuarioNome: requerenteNome,
      dataInicio: t.datainicio ? t.datainicio.toISOString() : t.datatransacao.toISOString(),
      dataFim: t.datafim ? t.datafim.toISOString() : t.datatransacao.toISOString(),
      status: t.estado?.tipoestado || 'Pendente',
      createdAt: t.datatransacao.toISOString(),
      figurinoNome: figurinoNome,
      figurinoTamanho: t.anuncio?.figurino?.tamanho?.nometamanho || '',
      figurinoCor: t.anuncio?.figurino?.cor?.nomecor || '',
      figurinoGenero: t.anuncio?.figurino?.genero?.nomegenero || '',
      figurinoTipo: t.anuncio?.figurino?.modelofigurino?.tipofigurino?.tipofigurino || '',
      figurinoQuantidade: t.quantidade,
      figurinoLocalizacao: t.anuncio?.figurino?.itemfigurino?.localizacao || '',
      valorAluguer: t.anuncio?.valor,
      figurinoId: t.anuncio?.figurinoidfigurino,
      motivorejeicao: t.motivorejeicao || null,
    };
  });
};

async function criarNotificacaoReserva(transacaoId, anuncioId) {
  const direcao = await prisma.direcao.findFirst({
    include: { utilizador: true }
  });
  
  if (direcao) {
    const notificacao = buildNotification('aluguerReserva', { transacaoId, anuncioId });
    await prisma.notificacao.create({
      data: {
        mensagem: notificacao.mensagem,
        tipo: notificacao.tipo,
        utilizadoriduser: direcao.utilizadoriduser,
        referencia_id: transacaoId,
        referencia_tipo: notificacao.referencia_tipo,
      },
    });
  }
}

async function criarNotificacaoStatus(transacao) {
  const novoEstado = transacao.estado.tipoestado;
  const notificacao = buildNotification('aluguerEstado', { transacaoId: transacao.idtransacao, estado: novoEstado });

  if (transacao.encarregadoeducacaoutilizadoriduser) {
    await prisma.notificacao.create({
      data: {
        mensagem: notificacao.mensagem,
        tipo: notificacao.tipo,
        utilizadoriduser: transacao.encarregadoeducacaoutilizadoriduser,
        referencia_id: transacao.idtransacao,
        referencia_tipo: notificacao.referencia_tipo,
      },
    });
  }
  if (transacao.professorutilizadoriduser) {
    await prisma.notificacao.create({
      data: {
        mensagem: notificacao.mensagem,
        tipo: notificacao.tipo,
        utilizadoriduser: transacao.professorutilizadoriduser,
        referencia_id: transacao.idtransacao,
        referencia_tipo: notificacao.referencia_tipo,
      },
    });
  }
}

export const getEstados = async () => {
  return prisma.estado.findMany({
    where: {
      tipoestado: { in: ["Pendente", "Aprovado", "Rejeitado", "Concluído", "Cancelado"], mode: 'insensitive' }
    }
  });
};
