-- Migration: Add pedidoalteracaoperfil table for direcao-approved profile changes

CREATE TABLE "pedidoalteracaoperfil" (
    "idpedidoalteracao" SERIAL NOT NULL,
    "alunoidaluno" INTEGER NOT NULL,
    "solicitadopor" INTEGER NOT NULL,
    "novodataNascimento" DATE,
    "novasmodalidades" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    "dataSolicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataResposta" TIMESTAMP(3),
    "respondidopor" INTEGER,
    "motivoRejeicao" VARCHAR(500),

    CONSTRAINT "pedidoalteracaoperfil_pkey" PRIMARY KEY ("idpedidoalteracao")
);

ALTER TABLE "pedidoalteracaoperfil" ADD CONSTRAINT "pedidoalteracaoperfil_alunoidaluno_fkey"
    FOREIGN KEY ("alunoidaluno") REFERENCES "aluno"("idaluno") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "pedidoalteracaoperfil" ADD CONSTRAINT "pedidoalteracaoperfil_solicitadopor_fkey"
    FOREIGN KEY ("solicitadopor") REFERENCES "utilizador"("iduser") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "pedidoalteracaoperfil" ADD CONSTRAINT "pedidoalteracaoperfil_respondidopor_fkey"
    FOREIGN KEY ("respondidopor") REFERENCES "utilizador"("iduser") ON DELETE NO ACTION ON UPDATE NO ACTION;
