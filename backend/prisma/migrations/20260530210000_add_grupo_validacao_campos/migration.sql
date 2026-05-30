-- AlterTable: grupo
ALTER TABLE "grupo" ADD COLUMN "estudioAprovadoId" INTEGER;
ALTER TABLE "grupo" ADD COLUMN "motivoRejeicao" VARCHAR(500);

-- AlterTable: alunogrupo
ALTER TABLE "alunogrupo" ADD COLUMN "statusValidacaoEE" VARCHAR(20) DEFAULT 'PENDENTE';
ALTER TABLE "alunogrupo" ADD COLUMN "dataRespostaEE" TIMESTAMP(3);
ALTER TABLE "alunogrupo" ADD COLUMN "motivoRejeicaoEE" VARCHAR(500);
