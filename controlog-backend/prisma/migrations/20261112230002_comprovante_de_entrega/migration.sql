-- CreateTable
CREATE TABLE "comprovantes_entrega" (
    "id" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "nome_original" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entrega_id" TEXT NOT NULL,

    CONSTRAINT "comprovantes_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comprovantes_entrega_entrega_id_idx" ON "comprovantes_entrega"("entrega_id");

-- AddForeignKey
ALTER TABLE "comprovantes_entrega" ADD CONSTRAINT "comprovantes_entrega_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
