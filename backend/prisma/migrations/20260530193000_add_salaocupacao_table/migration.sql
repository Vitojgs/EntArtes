-- CreateTable
CREATE TABLE "salaocupacao" (
    "idsalaocupacao" SERIAL NOT NULL,
    "salaidsala" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "horainicio" TIME(6) NOT NULL,
    "horafim" TIME(6) NOT NULL,
    "tipo_ocupacao" VARCHAR(50),
    "responsavel" VARCHAR(255),
    "observacoes" TEXT,
    "direcaoutilizadoriduser" INTEGER,
    "datacriacao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salaocupacao_pkey" PRIMARY KEY ("idsalaocupacao")
);

-- CreateIndex
CREATE INDEX "idx_salaocupacao_sala_data" ON "salaocupacao"("salaidsala", "data");

-- AddForeignKey
ALTER TABLE "salaocupacao" ADD CONSTRAINT "fksalaocupacao_sala" FOREIGN KEY ("salaidsala") REFERENCES "sala"("idsala") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "salaocupacao" ADD CONSTRAINT "fksalaocupacao_direcao" FOREIGN KEY ("direcaoutilizadoriduser") REFERENCES "direcao"("utilizadoriduser") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Backfill existing occupancy-like records from pedidodeaula
INSERT INTO "salaocupacao" (
    "salaidsala",
    "data",
    "horainicio",
    "horafim",
    "tipo_ocupacao",
    "responsavel",
    "observacoes",
    "direcaoutilizadoriduser",
    "datacriacao"
)
SELECT
    pa."salaidsala",
    pa."data",
    pa."horainicio",
    (pa."horainicio" + pa."duracaoaula"::text::interval)::time(6) AS "horafim",
    pa."tipo_ocupacao",
    pa."responsavel",
    pa."observacoes",
    pa."encarregadoeducacaoutilizadoriduser" AS "direcaoutilizadoriduser",
    pa."datapedido" AS "datacriacao"
FROM "pedidodeaula" pa
WHERE pa."tipo_ocupacao" IS NOT NULL;
