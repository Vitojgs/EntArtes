CREATE TABLE "eventopresenca" (
    "eventoidevento" INTEGER NOT NULL,
    "utilizadoriduser" INTEGER NOT NULL,
    "confirmado" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventopresenca_pkey" PRIMARY KEY ("eventoidevento","utilizadoriduser")
);

ALTER TABLE "eventopresenca" ADD CONSTRAINT "eventopresenca_eventoidevento_fkey" FOREIGN KEY ("eventoidevento") REFERENCES "evento"("idevento") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "eventopresenca" ADD CONSTRAINT "eventopresenca_utilizadoriduser_fkey" FOREIGN KEY ("utilizadoriduser") REFERENCES "utilizador"("iduser") ON DELETE NO ACTION ON UPDATE NO ACTION;
