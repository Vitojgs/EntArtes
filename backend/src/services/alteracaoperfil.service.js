import prisma from "../config/db.js";

export const solicitarAlteracao = async (alunoId, solicitanteId, data) => {
  const { novodataNascimento, novasmodalidades } = data;

  // Verify the aluno exists and solicitante is their encarregado
  const aluno = await prisma.aluno.findUnique({
    where: { idaluno: alunoId },
  });
  if (!aluno) throw new Error("Aluno não encontrado");
  if (aluno.encarregadoiduser !== parseInt(solicitanteId)) {
    throw new Error("Apenas o encarregado de educação pode solicitar alterações");
  }

  // Validate at least one field is being changed
  if (!novodataNascimento && !novasmodalidades) {
    throw new Error("Deve fornecer pelo menos um campo para alterar");
  }

  return prisma.pedidoalteracaoperfil.create({
    data: {
      alunoidaluno: alunoId,
      solicitadopor: parseInt(solicitanteId),
      novodataNascimento: novodataNascimento ? new Date(novodataNascimento) : null,
      novasmodalidades: novasmodalidades ? JSON.stringify(novasmodalidades) : null,
      status: "PENDENTE",
    },
    include: {
      aluno: { include: { utilizador: { select: { nome: true } } } },
      solicitante: { select: { nome: true } },
    },
  });
};

export const listarPendentes = async () => {
  return prisma.pedidoalteracaoperfil.findMany({
    where: { status: "PENDENTE" },
    orderBy: { dataSolicitacao: "desc" },
    include: {
      aluno: {
        include: {
          utilizador: { select: { iduser: true, nome: true, dataNascimento: true } },
          modalidadealuno: { include: { modalidade: true } },
        },
      },
      solicitante: { select: { iduser: true, nome: true } },
    },
  });
};

export const aprovarAlteracao = async (pedidoId, respondedorId) => {
  const pedido = await prisma.pedidoalteracaoperfil.findUnique({
    where: { idpedidoalteracao: pedidoId },
    include: { aluno: true },
  });
  if (!pedido) throw new Error("Pedido não encontrado");
  if (pedido.status !== "PENDENTE") throw new Error("Pedido já foi processado");

  // Apply the changes to the aluno
  const updateData = {};
  if (pedido.novodataNascimento) {
    updateData.dataNascimento = pedido.novodataNascimento;
    // Also update the utilizador's dataNascimento
    await prisma.utilizador.update({
      where: { iduser: pedido.aluno.utilizadoriduser },
      data: { dataNascimento: pedido.novodataNascimento },
    });
  }
  if (pedido.novasmodalidades) {
    const modalidades = JSON.parse(pedido.novasmodalidades);
    await prisma.modalidadealuno.deleteMany({
      where: { alunoidaluno: pedido.alunoidaluno },
    });
    for (const modId of modalidades) {
      try {
        await prisma.modalidadealuno.create({
          data: { alunoidaluno: pedido.alunoidaluno, modalidadeidmodalidade: parseInt(modId) },
        });
      } catch (_) {}
    }
  }

  // Mark pedido as approved
  return prisma.pedidoalteracaoperfil.update({
    where: { idpedidoalteracao: pedidoId },
    data: {
      status: "APROVADO",
      dataResposta: new Date(),
      respondidopor: parseInt(respondedorId),
    },
    include: {
      aluno: { include: { utilizador: { select: { nome: true } } } },
      solicitante: { select: { nome: true } },
      respondedor: { select: { nome: true } },
    },
  });
};

export const rejeitarAlteracao = async (pedidoId, respondedorId, motivo) => {
  const pedido = await prisma.pedidoalteracaoperfil.findUnique({
    where: { idpedidoalteracao: pedidoId },
  });
  if (!pedido) throw new Error("Pedido não encontrado");
  if (pedido.status !== "PENDENTE") throw new Error("Pedido já foi processado");

  return prisma.pedidoalteracaoperfil.update({
    where: { idpedidoalteracao: pedidoId },
    data: {
      status: "REJEITADO",
      dataResposta: new Date(),
      respondidopor: parseInt(respondedorId),
      motivoRejeicao: motivo || null,
    },
    include: {
      aluno: { include: { utilizador: { select: { nome: true } } } },
      solicitante: { select: { nome: true } },
      respondedor: { select: { nome: true } },
    },
  });
};

export const listarPorAluno = async (alunoId) => {
  return prisma.pedidoalteracaoperfil.findMany({
    where: { alunoidaluno: alunoId },
    orderBy: { dataSolicitacao: "desc" },
    include: {
      solicitante: { select: { nome: true } },
      respondedor: { select: { nome: true } },
    },
  });
};

export const listarPorEncarregado = async (encarregadoId) => {
  return prisma.pedidoalteracaoperfil.findMany({
    where: { solicitadopor: parseInt(encarregadoId) },
    orderBy: { dataSolicitacao: "desc" },
    include: {
      aluno: { include: { utilizador: { select: { nome: true } } } },
      respondedor: { select: { nome: true } },
    },
  });
};
