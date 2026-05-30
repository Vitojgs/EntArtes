-- CreateTable: colecao
CREATE TABLE IF NOT EXISTS "colecao" (
    "idcolecao" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "colecao_pkey" PRIMARY KEY ("idcolecao")
);

-- CreateTable: colecaofigurino (join table colecao-figurino)
CREATE TABLE IF NOT EXISTS "colecaofigurino" (
    "idcolecaofigurino" SERIAL NOT NULL,
    "colecaoidcolecao" INTEGER NOT NULL,
    "figurinoidfigurino" INTEGER NOT NULL,

    CONSTRAINT "colecaofigurino_pkey" PRIMARY KEY ("idcolecaofigurino")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "colecaofigurino_colecaoidcolecao_figurinoidfigurino_key"
    ON "colecaofigurino"("colecaoidcolecao", "figurinoidfigurino");

-- AlterTable: add diasLavagem to figurino
ALTER TABLE "figurino" ADD COLUMN IF NOT EXISTS "diasLavagem" INTEGER NOT NULL DEFAULT 3;

-- AddForeignKey: colecaofigurino -> colecao
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fkcolecaofigurino_colecao'
    ) THEN
        ALTER TABLE "colecaofigurino"
            ADD CONSTRAINT "fkcolecaofigurino_colecao"
            FOREIGN KEY ("colecaoidcolecao") REFERENCES "colecao"("idcolecao")
            ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

-- AddForeignKey: colecaofigurino -> figurino
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fkcolecaofigurino_figurino'
    ) THEN
        ALTER TABLE "colecaofigurino"
            ADD CONSTRAINT "fkcolecaofigurino_figurino"
            FOREIGN KEY ("figurinoidfigurino") REFERENCES "figurino"("idfigurino")
            ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;
