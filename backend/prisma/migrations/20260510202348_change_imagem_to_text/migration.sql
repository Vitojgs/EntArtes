/*
  Warnings:

  - You are about to drop the column `dataevento` on the `evento` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "evento" DROP COLUMN "dataevento",
ALTER COLUMN "imagem" SET DATA TYPE TEXT,
ALTER COLUMN "linkbilhetes" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "eventoData" (
    "ideventodata" SERIAL NOT NULL,
    "dataevento" DATE NOT NULL,
    "eventoidevento" INTEGER NOT NULL,

    CONSTRAINT "eventoData_pkey" PRIMARY KEY ("ideventodata")
);

-- AddForeignKey
ALTER TABLE "eventoData" ADD CONSTRAINT "eventoData_eventoidevento_fkey" FOREIGN KEY ("eventoidevento") REFERENCES "evento"("idevento") ON DELETE CASCADE ON UPDATE CASCADE;
