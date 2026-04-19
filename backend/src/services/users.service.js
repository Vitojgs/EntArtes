import prisma from "../config/db.js";
import bcrypt from "bcrypt";

// Returns all users without passwords
export const getAllUsers = async () => {
  const users = await prisma.utilizador.findMany({
    select: {
      iduser: true,
      nome: true,
      email: true,
      telemovel: true,
      estado: true,
      role: true,
      aluno: {
        select: {
          idaluno: true,
          encarregadoiduser: true
        }
      }
    }
  });
  
  const usersWithAlunos = await Promise.all(users.map(async u => {
    let alunosIds = [];
    let alunosNomes = [];
    
    if (u.role?.toLowerCase() === 'encarregado') {
      const alunos = await prisma.aluno.findMany({
        where: { encarregadoiduser: u.iduser },
        select: { utilizadoriduser: true }
      });
      alunosIds = alunos.map(a => a.utilizadoriduser.toString());
      
      const alunosUsers = await prisma.utilizador.findMany({
        where: { iduser: { in: alunos.map(a => a.utilizadoriduser) } },
        select: { nome: true }
      });
      alunosNomes = alunosUsers.map(a => a.nome);
    }
    
    return {
      iduser: u.iduser,
      nome: u.nome,
      email: u.email,
      telemovel: u.telemovel,
      estado: u.estado,
      role: u.role,
      encarregadoId: u.aluno?.[0]?.encarregadoiduser?.toString() || null,
      alunosIds,
      alunosNomes
    };
  }));
  
  const result = await Promise.all(usersWithAlunos.map(async u => {
    let encarregadoNome = null;
    if (u.encarregadoId) {
      const enc = await prisma.utilizador.findUnique({
        where: { iduser: parseInt(u.encarregadoId) },
        select: { nome: true }
      });
      encarregadoNome = enc?.nome;
    }
    return {
      id: u.iduser.toString(),
      nome: u.nome,
      email: u.email,
      telemovel: u.telemovel,
      estado: u.estado,
      role: u.role,
      encarregadoId: u.encarregadoId,
      encarregadoNome,
      alunosIds: u.alunosIds,
      alunosNomes: u.alunosNomes
    };
  }));
  
  return result;
};

// Returns user by ID without password
export const getUserById = async (id) => {
  const user = await prisma.utilizador.findUnique({
    where: { iduser: id },
    select: {
      iduser: true,
      nome: true,
      email: true,
      telemovel: true,
      estado: true,
      role: true
    }
  });
  return user;
};

// Creates user with hashed password
export const createUser = async (data) => {
  const { nome, email, telemovel, password, role } = data;

  // Check if email already exists
  const existingUser = await prisma.utilizador.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error("Email já registado");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.utilizador.create({
    data: {
      nome,
      email,
      telemovel,
      password: hashedPassword,
      estado: true,
      role: role || "utilizador"
    },
    select: {
      iduser: true,
      nome: true,
      email: true,
      telemovel: true,
      estado: true,
      role: true
    }
  });

  return user;
};

// Updates user
export const updateUser = async (id, data) => {
  const { nome, email, telemovel, password, role, estado, encarregadoId } = data;

  // Check if user exists
  const existingUser = await prisma.utilizador.findUnique({
    where: { iduser: id }
  });

  if (!existingUser) {
    throw new Error("Utilizador não encontrado");
  }

  // Handle role change - create or remove associations
  let previousRole = existingUser.role?.toLowerCase();
  let newRole = role?.toLowerCase();

  // Check if changing to aluno - need to create aluno record
  if (newRole === "aluno" && previousRole !== "aluno") {
    await prisma.aluno.create({
      data: { utilizadoriduser: id }
    });
  } else if (previousRole === "aluno" && newRole !== "aluno") {
    // Remove aluno record when changing from aluno
    await prisma.aluno.delete({
      where: { utilizadoriduser: id }
    }).catch(() => {});
  }

  // Check if changing to encarregado - need to create encarregado record
  if (newRole === "encarregado" && previousRole !== "encarregado") {
    await prisma.encarregadoeducacao.create({
      data: { utilizadoriduser: id }
    });
  } else if (previousRole === "encarregado" && newRole !== "encarregado") {
    await prisma.encarregadoeducacao.delete({
      where: { utilizadoriduser: id }
    }).catch(() => {});
  }

  // Check if changing to professor - need to create professor record
  if (newRole === "professor" && previousRole !== "professor") {
    await prisma.professor.create({
      data: { utilizadoriduser: id }
    });
  } else if (previousRole === "professor" && newRole !== "professor") {
    await prisma.professor.delete({
      where: { utilizadoriduser: id }
    }).catch(() => {});
  }

  // Check if changing to direcao - need to create direcao record
  if (newRole === "direcao" && previousRole !== "direcao") {
    await prisma.direcao.create({
      data: { utilizadoriduser: id }
    });
  } else if (previousRole === "direcao" && newRole !== "direcao") {
    await prisma.direcao.delete({
      where: { utilizadoriduser: id }
    }).catch(() => {});
  }

// Handle encarregado relationship for students
  const currentRole = existingUser.role?.toLowerCase();
  if (encarregadoId !== undefined && (newRole === "aluno" || currentRole === "aluno")) {
    const existsAluno = await prisma.aluno.findFirst({
      where: { utilizadoriduser: id }
    });

    if (encarregadoId) {
      // Verify encarregado exists
      const existsEncarregado = await prisma.encarregadoeducacao.findFirst({
        where: { utilizadoriduser: parseInt(encarregadoId) }
      });

      if (!existsEncarregado) {
        throw new Error("Encarregado de educação não encontrado");
      }

      if (existsAluno) {
        await prisma.aluno.update({
          where: { idaluno: existsAluno.idaluno },
          data: { encarregadoiduser: parseInt(encarregadoId) }
        });
      } else {
        await prisma.aluno.create({
          data: { utilizadoriduser: id, encarregadoiduser: parseInt(encarregadoId) }
        });
      }
} else if (existsAluno) {
      await prisma.aluno.update({
        where: { idaluno: existsAluno.idaluno },
        data: { encarregadoiduser: null }
      });
    }
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== existingUser.email) {
    const emailExists = await prisma.utilizador.findUnique({
      where: { email }
    });
    if (emailExists) {
      throw new Error("Email já está em uso");
    }
  }

  const updateData = {};
  if (nome) updateData.nome = nome;
  if (email) updateData.email = email;
  if (telemovel) updateData.telemovel = telemovel;
  if (role) updateData.role = role;
  if (estado !== undefined) updateData.estado = estado;
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.utilizador.update({
    where: { iduser: id },
    data: updateData,
    select: {
      iduser: true,
      nome: true,
      email: true,
      telemovel: true,
      estado: true,
      role: true
    }
  });

  // Return additional fields for students
  if (newRole === "aluno") {
    const existsAluno = await prisma.aluno.findFirst({
      where: { utilizadoriduser: id }
    });
    if (existsAluno) {
      user.encarregadoId = existsAluno.encarregadoiduser?.toString() || null;
    }
  }

  // Return alunos for guardians
  if (newRole === "encarregado") {
    const alunos = await prisma.aluno.findMany({
      where: { encarregadoiduser: id },
      select: { utilizadoriduser: true }
    });
    user.alunosIds = alunos.map(a => a.utilizadoriduser.toString());
  }

  return user;
};

// Deletes user
export const deleteUser = async (id) => {
  const existingUser = await prisma.utilizador.findUnique({
    where: { iduser: id }
  });

  if (!existingUser) {
    throw new Error("Utilizador não encontrado");
  }

  await prisma.utilizador.delete({
    where: { iduser: id }
  });

  return { message: "Utilizador eliminado com sucesso" };
};