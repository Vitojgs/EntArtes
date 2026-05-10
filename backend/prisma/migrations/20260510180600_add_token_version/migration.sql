/*
  Warnings:

  - You are about to drop the column `disponibilidadeiddisponibilidade` on the `pedidodeaula` table. All the data in the column will be lost.
  - You are about to drop the `disponibilidade` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tipoaula` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "disponibilidade" DROP CONSTRAINT "fkdisponibil276660";

-- DropForeignKey
ALTER TABLE "disponibilidade" DROP CONSTRAINT "fkdisponibil315555";

-- DropForeignKey
ALTER TABLE "disponibilidade" DROP CONSTRAINT "fkdisponibil456629";

-- DropForeignKey
ALTER TABLE "pedidodeaula" DROP CONSTRAINT "fkpedidodeau349532";

-- AlterTable
ALTER TABLE "aluno" ADD COLUMN     "encarregadoiduser" INTEGER;

-- AlterTable
ALTER TABLE "anuncio" ADD COLUMN     "motivorejeicao" TEXT,
ADD COLUMN     "tipotransacao" TEXT NOT NULL DEFAULT 'ALUGUER',
ALTER COLUMN "valor" DROP NOT NULL,
ALTER COLUMN "valor" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "datainicio" DROP NOT NULL,
ALTER COLUMN "datafim" DROP NOT NULL,
ALTER COLUMN "direcaoutilizadoriduser" DROP NOT NULL,
ALTER COLUMN "encarregadoeducacaoutilizadoriduser" DROP NOT NULL,
ALTER COLUMN "professorutilizadoriduser" DROP NOT NULL;

-- AlterTable
ALTER TABLE "figurino" ADD COLUMN     "stockminimo" INTEGER NOT NULL DEFAULT 5,
ALTER COLUMN "encarregadoeducacaoutilizadoriduser" DROP NOT NULL,
ALTER COLUMN "direcaoutilizadoriduser" DROP NOT NULL,
ALTER COLUMN "professorutilizadoriduser" DROP NOT NULL,
ALTER COLUMN "itemfigurinoiditem" DROP NOT NULL;

-- AlterTable
ALTER TABLE "grupo" ADD COLUMN     "cor" VARCHAR(20),
ADD COLUMN     "dataFim" VARCHAR(20),
ADD COLUMN     "dataInicio" VARCHAR(20),
ADD COLUMN     "descricao" VARCHAR(1000),
ADD COLUMN     "diasSemana" VARCHAR(50),
ADD COLUMN     "duracao" INTEGER,
ADD COLUMN     "estudioId" INTEGER,
ADD COLUMN     "faixaEtaria" VARCHAR(50),
ADD COLUMN     "horaFim" VARCHAR(5),
ADD COLUMN     "horaInicio" VARCHAR(5),
ADD COLUMN     "lotacaoMaxima" INTEGER,
ADD COLUMN     "modalidade" VARCHAR(100),
ADD COLUMN     "nivel" VARCHAR(50),
ADD COLUMN     "professorId" INTEGER,
ADD COLUMN     "requisitos" VARCHAR(500),
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'ABERTA';

-- AlterTable
ALTER TABLE "modelofigurino" ALTER COLUMN "fotografia" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "pedidodeaula" DROP COLUMN "disponibilidadeiddisponibilidade",
ADD COLUMN     "alunoutilizadoriduser" INTEGER,
ADD COLUMN     "disponibilidade_mensal_id" INTEGER,
ADD COLUMN     "novaDataLimite" TIMESTAMP(3),
ADD COLUMN     "novadata" DATE,
ADD COLUMN     "professorutilizadoriduser" INTEGER,
ADD COLUMN     "sugestaoestado" TEXT,
ALTER COLUMN "datapedido" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "grupoidgrupo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sala" ALTER COLUMN "nomesala" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "transacaofigurino" ADD COLUMN     "datafim" DATE,
ADD COLUMN     "datainicio" DATE,
ADD COLUMN     "encarregadoeducacaoutilizadoriduser" INTEGER,
ADD COLUMN     "motivorejeicao" TEXT,
ADD COLUMN     "professorutilizadoriduser" INTEGER,
ALTER COLUMN "itemfigurinoiditem" DROP NOT NULL,
ALTER COLUMN "direcaoutilizadoriduser" DROP NOT NULL;

-- AlterTable
ALTER TABLE "utilizador" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "telemovel" DROP NOT NULL;

-- DropTable
DROP TABLE "disponibilidade";

-- DropTable
DROP TABLE "tipoaula";

-- CreateTable
CREATE TABLE "alunopedidoaula" (
    "idalunopedidoaula" SERIAL NOT NULL,
    "alunoidaluno" INTEGER NOT NULL,
    "pedidodeaulaidpedidoaula" INTEGER NOT NULL,
    "datainscricao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alunopedidoaula_pkey" PRIMARY KEY ("idalunopedidoaula")
);

-- CreateTable
CREATE TABLE "presenca" (
    "idpresenca" SERIAL NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "datahora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aulaidaula" INTEGER NOT NULL,
    "alunoidaluno" INTEGER NOT NULL,

    CONSTRAINT "presenca_pkey" PRIMARY KEY ("idpresenca")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "idnotificacao" SERIAL NOT NULL,
    "mensagem" VARCHAR(500) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "dataleitura" TIMESTAMP(3),
    "datanotificacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilizadoriduser" INTEGER NOT NULL,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("idnotificacao")
);

-- CreateTable
CREATE TABLE "disponibilidade_mensal" (
    "iddisponibilidade_mensal" SERIAL NOT NULL,
    "professorutilizadoriduser" INTEGER NOT NULL,
    "modalidadesprofessoridmodalidadeprofessor" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "horainicio" TIME(6) NOT NULL,
    "horafim" TIME(6) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "salaid" INTEGER,
    "minutos_ocupados" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "disponibilidade_mensal_pkey" PRIMARY KEY ("iddisponibilidade_mensal")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "idaudit" SERIAL NOT NULL,
    "utilizadorid" INTEGER,
    "utilizadornome" VARCHAR(255) NOT NULL,
    "acao" VARCHAR(50) NOT NULL,
    "entidade" VARCHAR(100) NOT NULL,
    "entidadeid" INTEGER,
    "detalhes" VARCHAR(1000),
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("idaudit")
);

-- CreateTable
CREATE TABLE "evento" (
    "idevento" SERIAL NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "dataevento" DATE NOT NULL,
    "localizacao" VARCHAR(255),
    "imagem" VARCHAR(500),
    "linkbilhetes" VARCHAR(500),
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "datacriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direcaoutilizadoriduser" INTEGER,
    "datafim" DATE,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("idevento")
);

-- AddForeignKey
ALTER TABLE "aluno" ADD CONSTRAINT "fkalunoencarregado" FOREIGN KEY ("encarregadoiduser") REFERENCES "encarregadoeducacao"("utilizadoriduser") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alunopedidoaula" ADD CONSTRAINT "fkalunopedidoaula" FOREIGN KEY ("alunoidaluno") REFERENCES "aluno"("idaluno") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alunopedidoaula" ADD CONSTRAINT "fkalunopedidoaula2" FOREIGN KEY ("pedidodeaulaidpedidoaula") REFERENCES "pedidodeaula"("idpedidoaula") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "presenca" ADD CONSTRAINT "fkpresencaaluno" FOREIGN KEY ("alunoidaluno") REFERENCES "aluno"("idaluno") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "presenca" ADD CONSTRAINT "fkpresencaaula" FOREIGN KEY ("aulaidaula") REFERENCES "aula"("idaula") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pedidodeaula" ADD CONSTRAINT "pedidodeaula_disponibilidade_mensal_id_fkey" FOREIGN KEY ("disponibilidade_mensal_id") REFERENCES "disponibilidade_mensal"("iddisponibilidade_mensal") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transacaofigurino" ADD CONSTRAINT "fktransacaofencarregado" FOREIGN KEY ("encarregadoeducacaoutilizadoriduser") REFERENCES "encarregadoeducacao"("utilizadoriduser") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transacaofigurino" ADD CONSTRAINT "fktransacaofprofessor" FOREIGN KEY ("professorutilizadoriduser") REFERENCES "professor"("utilizadoriduser") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_utilizadoriduser_fkey" FOREIGN KEY ("utilizadoriduser") REFERENCES "utilizador"("iduser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilidade_mensal" ADD CONSTRAINT "disponibilidade_mensal_modalidadesprofessoridmodalidadepro_fkey" FOREIGN KEY ("modalidadesprofessoridmodalidadeprofessor") REFERENCES "modalidadeprofessor"("idmodalidadeprofessor") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "disponibilidade_mensal" ADD CONSTRAINT "disponibilidade_mensal_professorutilizadoriduser_fkey" FOREIGN KEY ("professorutilizadoriduser") REFERENCES "professor"("utilizadoriduser") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "disponibilidade_mensal" ADD CONSTRAINT "disponibilidade_mensal_salaid_fkey" FOREIGN KEY ("salaid") REFERENCES "sala"("idsala") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_direcaoutilizadoriduser_fkey" FOREIGN KEY ("direcaoutilizadoriduser") REFERENCES "direcao"("utilizadoriduser") ON DELETE NO ACTION ON UPDATE NO ACTION;
