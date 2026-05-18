-- AlterTable: tornar salaidsala opcional em pedidodeaula
ALTER TABLE "pedidodeaula" ALTER COLUMN "salaidsala" DROP NOT NULL;
