-- AlterTable: add nivel to aluno
ALTER TABLE "aluno" ADD COLUMN IF NOT EXISTS "nivel" VARCHAR(50);

-- AlterTable: add dataNascimento to utilizador
ALTER TABLE "utilizador" ADD COLUMN IF NOT EXISTS "dataNascimento" DATE;

-- CreateTable: modalidadealuno (join table aluno-modalidade)
CREATE TABLE IF NOT EXISTS "modalidadealuno" (
    "idmodalidadealuno" SERIAL NOT NULL,
    "alunoidaluno" INTEGER NOT NULL,
    "modalidadeidmodalidade" INTEGER NOT NULL,

    CONSTRAINT "modalidadealuno_pkey" PRIMARY KEY ("idmodalidadealuno")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "modalidadealuno_alunoidaluno_modalidadeidmodalidade_key"
    ON "modalidadealuno"("alunoidaluno", "modalidadeidmodalidade");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fkmodalidadealuno780021'
    ) THEN
        ALTER TABLE "modalidadealuno"
            ADD CONSTRAINT "fkmodalidadealuno780021"
            FOREIGN KEY ("alunoidaluno") REFERENCES "aluno"("idaluno")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fkmodalidadealuno914563'
    ) THEN
        ALTER TABLE "modalidadealuno"
            ADD CONSTRAINT "fkmodalidadealuno914563"
            FOREIGN KEY ("modalidadeidmodalidade") REFERENCES "modalidade"("idmodalidade")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;
