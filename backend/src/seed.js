import prisma from "./config/db.js";
import bcrypt from "bcrypt";

const TABELAS_POR_ORDEM = [
  // 1º: tabelas folha (sem depender de outras)
  'notificacao',
  'audit_log',
  'presenca',
  'alunoaula',
  'alunogrupo',
  'alunopedidoaula',
  'transacaofigurino',
  // 2º: tabelas intermédias
  'aula',
  'pedidodeaula',
  'anuncio',
  '"eventoData"',
  'figurino',
  'modelofigurino',
  'tipofigurino',
  'itemfigurino',
  'disponibilidade_mensal',
  'modalidadeprofessor',
  'grupo',
  'evento',
  // 3º: tabelas que dependem de utilizador
  'aluno',
  'encarregadoeducacao',
  'professor',
  'direcao',
  // 4º: tabelas de sala
  'sala',
  'estadosala',
  'tiposala',
  // 5º: lookup tables
  'estadouso',
  'estadoaula',
  'estado',
  'modalidade',
  'cor',
  'genero',
  'tamanho',
  // último: utilizador
  'utilizador',
];

async function limparTudo() {
  console.log("🧹 A limpar TODAS as tabelas...\n");
  for (const tabela of TABELAS_POR_ORDEM) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM ${tabela}`);
    } catch (e) {
      // ignorar erros (tabela pode não existir)
    }
  }
  console.log("→ BD limpa.\n");
}

const seed = async () => {
  console.log("🌱 A povoar base de dados...\n");
  const hash = await bcrypt.hash("password123", 10);

  await limparTudo();

  // ── Estados de sala ────────────────────────────────────────────
  console.log("→ estadosala");
  for (const nome of ["Disponível", "Ocupada", "Em Manutenção"]) {
    await prisma.estadosala.create({ data: { nomeestadosala: nome } });
    console.log(`  ✓ ${nome}`);
  }

  // ── Tipo de sala ───────────────────────────────────────────────
  console.log("→ tiposala");
  await prisma.tiposala.create({ data: { nometiposala: "Estúdio" } });
  console.log("  ✓ Estúdio");

  // ── Estados de aula ────────────────────────────────────────────
  console.log("→ estadoaula");
  for (const nome of ["PENDENTE", "CONFIRMADO", "CANCELADO", "REALIZADO"]) {
    await prisma.estadoaula.create({ data: { nomeestadoaula: nome } });
    console.log(`  ✓ ${nome}`);
  }

  // ── Estados gerais ─────────────────────────────────────────────
  console.log("→ estado");
  for (const tipo of ["Pendente", "Confirmado", "Rejeitado", "Aprovado", "Cancelado", "Concluído"]) {
    await prisma.estado.create({ data: { tipoestado: tipo } });
    console.log(`  ✓ ${tipo}`);
  }

  // ── Estados de uso ─────────────────────────────────────────────
  console.log("→ estadouso");
  for (const nome of ["Novo", "Usado como Novo", "Usado"]) {
    await prisma.estadouso.create({ data: { estadouso: nome } });
    console.log(`  ✓ ${nome}`);
  }

  // ── Modalidades (8 de dança) ───────────────────────────────────
  console.log("→ modalidade");
  for (const nome of [
    "Ballet Clássico", "Dança Contemporânea", "Hip-Hop",
    "Jazz", "Dança Urbana", "Flamenco", "Dança Criativa", "Street Dance",
  ]) {
    await prisma.modalidade.create({ data: { nome } });
    console.log(`  ✓ ${nome}`);
  }

  // ── Cores ──────────────────────────────────────────────────────
  console.log("→ cor");
  for (const nome of [
    "Preto", "Branco", "Azul", "Vermelho", "Rosa",
    "Dourado", "Prateado", "Verde", "Roxo", "Laranja",
    "Amarelo", "Bege", "Cinzento", "Marinho", "Coral", "Lavanda",
  ]) {
    await prisma.cor.create({ data: { nomecor: nome } });
  }
  console.log(`  ✓ 16 cores`);

  // ── Géneros ────────────────────────────────────────────────────
  console.log("→ genero");
  for (const nome of [
    "Feminino", "Masculino", "Unissexo",
    "Infantil Feminino", "Infantil Masculino", "Unissexo Infantil",
  ]) {
    await prisma.genero.create({ data: { nomegenero: nome } });
    console.log(`  ✓ ${nome}`);
  }

  // ── Tamanhos ───────────────────────────────────────────────────
  console.log("→ tamanho");
  for (const nome of [
    "XS", "S", "M", "L", "XL", "XXL",
    "2", "4", "6", "8", "10", "12", "14", "16", "18",
    "34", "36", "38", "40", "42", "44",
  ]) {
    await prisma.tamanho.create({ data: { nometamanho: nome } });
  }
  console.log(`  ✓ 21 tamanhos`);

  // ── Tipos de figurino (dança) ──────────────────────────────────
  console.log("→ tipofigurino");
  for (const tipo of [
    "Collant de Ballet", "Saia de Ballet", "Tutu", "Leotard",
    "Calções de Dança", "Top de Dança", "Macacão",
    "Vestido de Espetáculo", "Camisa de Dança", "Calças de Dança",
    "Sapatilha de Ballet", "Sapatilha de Jazz", "Sapatilha de Dança",
    "Boné", "Luvas", "Meias de Dança", "Manto", "Capa", "Chapéu", "Fita de Ballet",
  ]) {
    await prisma.tipofigurino.create({ data: { tipofigurino: tipo } });
    console.log(`  ✓ ${tipo}`);
  }

  // ── Itens de figurino ──────────────────────────────────────────
  console.log("→ itemfigurino");
  for (const local of ["Armazém Principal", "Armazém Secundário", "Vitrine Principal", "Depósito A", "Depósito B"]) {
    await prisma.itemfigurino.create({ data: { localizacao: local } });
    console.log(`  ✓ ${local}`);
  }

  // ── Utilizadores (4) ───────────────────────────────────────────
  console.log("→ utilizadores");
  const direcaoUser = await prisma.utilizador.create({
    data: { nome: "Direção Ent'Artes", email: "direcao@entartes.pt", telemovel: "911111111", role: "DIRECAO", password: hash, estado: true },
  });
  console.log(`  ✓ direcao@entartes.pt (DIRECAO)`);

  const profUser = await prisma.utilizador.create({
    data: { nome: "Professor Ent'Artes", email: "professor@entartes.pt", telemovel: "911111112", role: "PROFESSOR", password: hash, estado: true },
  });
  console.log(`  ✓ professor@entartes.pt (PROFESSOR)`);

  const eeUser = await prisma.utilizador.create({
    data: { nome: "Encarregado Ent'Artes", email: "encarregado@entartes.pt", telemovel: "911111113", role: "ENCARREGADO", password: hash, estado: true, dataNascimento: new Date("1980-03-20") },
  });
  console.log(`  ✓ encarregado@entartes.pt (ENCARREGADO)`);

  const alunoUser = await prisma.utilizador.create({
    data: { nome: "Aluno Ent'Artes", email: "aluno@entartes.pt", telemovel: "911111114", role: "ALUNO", password: hash, estado: true, dataNascimento: new Date("2010-05-15") },
  });
  console.log(`  ✓ aluno@entartes.pt (ALUNO)`);

  // ── Registos de role ───────────────────────────────────────────
  console.log("→ registos de role");
  await prisma.direcao.create({ data: { utilizadoriduser: direcaoUser.iduser } });
  console.log("  ✓ direcao");
  await prisma.professor.create({ data: { utilizadoriduser: profUser.iduser } });
  console.log("  ✓ professor");
  await prisma.encarregadoeducacao.create({ data: { utilizadoriduser: eeUser.iduser } });
  console.log("  ✓ encarregadoeducacao");
  const alunoRec = await prisma.aluno.create({ data: { utilizadoriduser: alunoUser.iduser, encarregadoiduser: eeUser.iduser, nivel: "Iniciante" } });

  const modalidades = await prisma.modalidade.findMany();
  if (modalidades.length > 0) {
    for (const mod of modalidades.slice(0, 2)) {
      await prisma.modalidadealuno.create({
        data: { alunoidaluno: alunoRec.idaluno, modalidadeidmodalidade: mod.idmodalidade },
      });
    }
  }
  console.log("  ✓ aluno");

  // ── Salas (Estúdio 1-8) ────────────────────────────────────────
  console.log("→ salas");
  const estDisp = await prisma.estadosala.findFirst({ where: { nomeestadosala: "Disponível" } });
  const tEstudio = await prisma.tiposala.findFirst({ where: { nometiposala: "Estúdio" } });

  const capacidades = [20, 20, 15, 15, 12, 12, 10, 10];
  for (let i = 0; i < 8; i++) {
    await prisma.sala.create({
      data: {
        nomesala: `Estúdio ${i + 1}`,
        capacidade: capacidades[i],
        estadosalaidestadosala: estDisp.idestadosala,
        tiposalaidtiposala: tEstudio.idtiposala,
      },
    });
    console.log(`  ✓ Estúdio ${i + 1} (${capacidades[i]} pessoas)`);
  }

  console.log("\n✅ Seed concluída com sucesso!");
};

seed()
  .catch((e) => {
    console.error("❌ Erro na seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
