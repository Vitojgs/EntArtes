import prisma from "../config/db.js";

export const submitContact = async (req, reply) => {
  const { nome, email, telemovel, modalidade, faixaEtaria, mensagem } = req.body;

  if (!nome || !email || !telemovel) {
    return reply.status(400).send({ success: false, error: "Nome, email e telemovel são obrigatórios" });
  }

  const contacto = await prisma.contacto.create({
    data: {
      nome,
      email,
      telemovel,
      modalidade: modalidade || null,
      faixaetaria: faixaEtaria || null,
      mensagem: mensagem || null,
    }
  });

  return reply.status(201).send({ success: true, data: contacto });
};

export const getContactos = async (req, reply) => {
  const contactos = await prisma.contacto.findMany({
    orderBy: { datacriacao: 'desc' }
  });
  return reply.send({ success: true, data: contactos });
};
