import prisma from "../config/db.js";

export const getAllColecoes = async () => {
  const colecoes = await prisma.colecao.findMany({
    include: {
      figurinos: {
        include: {
          figurino: {
            include: {
              modelofigurino: true,
            },
          },
        },
      },
    },
    orderBy: { nome: "asc" },
  });

  return colecoes.map((c) => ({
    idcolecao: c.idcolecao,
    nome: c.nome,
    descricao: c.descricao,
    created_at: c.created_at,
    figurinos: c.figurinos.map((cf) => ({
      idfigurino: cf.figurino.idfigurino,
      nome: cf.figurino.modelofigurino?.nomemodelo || `Figurino #${cf.figurino.idfigurino}`,
    })),
    totalFigurinos: c.figurinos.length,
  }));
};

export const getColecaoById = async (id) => {
  const colecao = await prisma.colecao.findUnique({
    where: { idcolecao: id },
    include: {
      figurinos: {
        include: {
          figurino: {
            include: {
              modelofigurino: true,
              tamanho: true,
              cor: true,
              genero: true,
              estadouso: true,
            },
          },
        },
      },
    },
  });

  if (!colecao) return null;

  return {
    idcolecao: colecao.idcolecao,
    nome: colecao.nome,
    descricao: colecao.descricao,
    created_at: colecao.created_at,
    figurinos: colecao.figurinos.map((cf) => ({
      idfigurino: cf.figurino.idfigurino,
      nome: cf.figurino.modelofigurino?.nomemodelo || `Figurino #${cf.figurino.idfigurino}`,
      tamanho: cf.figurino.tamanho?.nometamanho,
      cor: cf.figurino.cor?.nomecor,
      genero: cf.figurino.genero?.nomegenero,
    })),
  };
};

export const createColecao = async (data) => {
  const { nome, descricao, figurinoIds } = data;

  const colecao = await prisma.colecao.create({
    data: {
      nome,
      descricao: descricao || null,
      figurinos: figurinoIds?.length
        ? {
            create: figurinoIds.map((id) => ({
              figurinoidfigurino: parseInt(id),
            })),
          }
        : undefined,
    },
    include: {
      figurinos: {
        include: { figurino: { include: { modelofigurino: true } } },
      },
    },
  });

  return {
    idcolecao: colecao.idcolecao,
    nome: colecao.nome,
    descricao: colecao.descricao,
    totalFigurinos: colecao.figurinos.length,
  };
};

export const updateColecao = async (id, data) => {
  const { nome, descricao, figurinoIds } = data;

  const colecao = await prisma.colecao.update({
    where: { idcolecao: id },
    data: {
      ...(nome ? { nome } : {}),
      ...(descricao !== undefined ? { descricao } : {}),
    },
  });

  if (figurinoIds !== undefined) {
    await prisma.colecaofigurino.deleteMany({
      where: { colecaoidcolecao: id },
    });

    if (figurinoIds.length > 0) {
      await prisma.colecaofigurino.createMany({
        data: figurinoIds.map((figId) => ({
          colecaoidcolecao: id,
          figurinoidfigurino: parseInt(figId),
        })),
      });
    }
  }

  return getColecaoById(id);
};

export const deleteColecao = async (id) => {
  // CASCADE handles colecaofigurino deletion
  await prisma.colecao.delete({ where: { idcolecao: id } });
};

export const addFigurinoToColecao = async (colecaoId, figurinoId) => {
  const existing = await prisma.colecaofigurino.findUnique({
    where: {
      colecaoidcolecao_figurinoidfigurino: {
        colecaoidcolecao: colecaoId,
        figurinoidfigurino: figurinoId,
      },
    },
  });

  if (existing) return { alreadyExists: true };

  await prisma.colecaofigurino.create({
    data: {
      colecaoidcolecao: colecaoId,
      figurinoidfigurino: figurinoId,
    },
  });

  return { success: true };
};

export const removeFigurinoFromColecao = async (colecaoId, figurinoId) => {
  await prisma.colecaofigurino.deleteMany({
    where: {
      colecaoidcolecao: colecaoId,
      figurinoidfigurino: figurinoId,
    },
  });
};

export const getDisponibilidadeFigurino = async (figurinoId, dataInicio, dataFim) => {
  const figurino = await prisma.figurino.findUnique({
    where: { idfigurino: figurinoId },
    select: { quantidadetotal: true, diasLavagem: true },
  });

  if (!figurino) return null;

  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);

  // Find conflicting reservations (transacoes with APROVADO status that overlap the requested period)
  // A reservation conflicts if its datainicio <= dataFim AND datafim >= dataInicio
  const estadoAprovado = await prisma.estado.findFirst({
    where: { tipoestado: { equals: "Aprovado", mode: "insensitive" } },
  });

  if (!estadoAprovado) {
    return { disponivel: figurino.quantidadetotal, total: figurino.quantidadetotal, proximaDataDisponivel: null };
  }

  const transacoes = await prisma.transacaofigurino.findMany({
    where: {
      anuncio: { figurinoidfigurino: figurinoId },
      estadoidestado: estadoAprovado.idestado,
      datainicio: { lte: fim },
      datafim: { gte: inicio },
    },
    select: { quantidade: true, datafim: true },
  });

  const totalReservado = transacoes.reduce((sum, t) => sum + t.quantidade, 0);
  const disponivel = Math.max(0, figurino.quantidadetotal - totalReservado);

  // Calculate next available date: find the earliest datafim + diasLavagem
  // for periods where stock is fully booked in the requested range
  let proximaDataDisponivel = null;
  if (disponivel <= 0 && transacoes.length > 0) {
    const datasFim = transacoes
      .map((t) => t.datafim)
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (datasFim.length > 0) {
      const ultimaDataFim = datasFim[datasFim.length - 1];
      const nextDate = new Date(ultimaDataFim);
      nextDate.setDate(nextDate.getDate() + (figurino.diasLavagem || 3) + 1);
      proximaDataDisponivel = nextDate.toISOString().split("T")[0];
    }
  }

  return { disponivel, total: figurino.quantidadetotal, proximaDataDisponivel };
};
