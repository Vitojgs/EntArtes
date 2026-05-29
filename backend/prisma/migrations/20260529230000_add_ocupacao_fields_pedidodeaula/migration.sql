-- AlterTable: add tipo_ocupacao, responsavel, observacoes columns to pedidodeaula
ALTER TABLE "pedidodeaula" ADD COLUMN     "tipo_ocupacao" VARCHAR(50);
ALTER TABLE "pedidodeaula" ADD COLUMN     "responsavel" VARCHAR(255);
ALTER TABLE "pedidodeaula" ADD COLUMN     "observacoes" TEXT;
