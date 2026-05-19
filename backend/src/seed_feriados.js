import prisma from "./config/db.js";

// Algorítmo de Computus (Gauss) para calcular a Páscoa
function calcularPascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function diasApos(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

function gerarFeriados(ano) {
  const pascoa = calcularPascoa(ano);

  return [
    { nome: 'Ano Novo',                data: new Date(ano, 0, 1),    tipo: 'NACIONAL' },
    { nome: 'Dia da Liberdade',        data: new Date(ano, 3, 25),   tipo: 'NACIONAL' },
    { nome: 'Dia do Trabalhador',      data: new Date(ano, 4, 1),    tipo: 'NACIONAL' },
    { nome: 'Dia de Portugal',         data: new Date(ano, 5, 10),   tipo: 'NACIONAL' },
    { nome: 'Assunção de Nossa Senhora', data: new Date(ano, 7, 15), tipo: 'NACIONAL' },
    { nome: 'Implantação da República',  data: new Date(ano, 9, 5),  tipo: 'NACIONAL' },
    { nome: 'Dia de Todos os Santos',  data: new Date(ano, 10, 1),   tipo: 'NACIONAL' },
    { nome: 'Imaculada Conceição',     data: new Date(ano, 11, 8),   tipo: 'NACIONAL' },
    { nome: 'Natal',                   data: new Date(ano, 11, 25),  tipo: 'NACIONAL' },
    { nome: 'Sexta-Feira Santa',       data: diasApos(pascoa, -2),   tipo: 'NACIONAL' },
    { nome: 'Páscoa',                  data: pascoa,                  tipo: 'NACIONAL' },
    { nome: 'Corpo de Deus',           data: diasApos(pascoa, 60),   tipo: 'NACIONAL' },
    { nome: 'São João (Feriado Municipal de Braga)', data: new Date(ano, 5, 24), tipo: 'MUNICIPAL' },
  ];
}

function descricaoFeriado(tipo) {
  if (tipo === 'NACIONAL') return 'Feriado nacional em Portugal.';
  return 'Feriado municipal do concelho de Braga.';
}

const seedFeriados = async () => {
  console.log("\n🌍 A adicionar feriados ao calendário...\n");

  const anos = [new Date().getFullYear(), new Date().getFullYear() + 1];

  for (const ano of anos) {
    const feriados = gerarFeriados(ano);
    console.log(`→ ${ano}`);

    for (const f of feriados) {
      const dataStr = formatDate(f.data);
      const titulo = `🇵🇹 ${f.nome}`;

      const existente = await prisma.evento.findFirst({
        where: {
          titulo,
          datas: {
            some: {
              dataevento: new Date(dataStr)
            }
          }
        }
      });

      if (existente) {
        console.log(`  ✓ ${titulo} — ${dataStr} (já existe)`);
        continue;
      }

      await prisma.evento.create({
        data: {
          titulo,
          descricao: descricaoFeriado(f.tipo),
          datafim: new Date(dataStr),
          publicado: true,
          destaque: false,
          datas: {
            create: [{ dataevento: new Date(dataStr) }]
          }
        }
      });
      console.log(`  ✓ ${titulo} — ${dataStr}`);
    }
  }

  console.log("\n✅ Feriados adicionados com sucesso!\n");
};

seedFeriados()
  .catch((e) => {
    console.error("❌ Erro ao adicionar feriados:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
