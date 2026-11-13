-- RENAME em vez do DROP + ADD que o diff do Prisma gerou.
--
-- O Prisma nao distingue "coluna renomeada" de "coluna trocada por outra", e
-- produziria `DROP COLUMN "cliente"` seguido de
-- `ADD COLUMN "cliente_nome" TEXT NOT NULL`. Isso apagaria o nome do cliente de
-- todo pedido ja existente e, pior, falharia na hora: uma coluna NOT NULL sem
-- valor padrao nao pode ser adicionada a uma tabela que ja tem linhas.
--
-- O rename preserva os valores e e instantaneo.
ALTER TABLE "pedidos" RENAME COLUMN "cliente" TO "cliente_nome";

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL DEFAULT 'Joinville',
    "uf" TEXT NOT NULL DEFAULT 'SC',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_codigo_key" ON "clientes"("codigo");

-- CreateIndex
CREATE INDEX "clientes_ativo_idx" ON "clientes"("ativo");

-- Vinculo do pedido ao cadastro. Nulo e permitido: pedidos criados antes deste
-- cadastro existir nao tem a quem apontar, e seguem validos pelo cliente_nome.
ALTER TABLE "pedidos" ADD COLUMN "cliente_id" TEXT;

-- SET NULL, e nao CASCADE: remover um cliente nao pode apagar o historico de
-- pedidos dele. O pedido perde o vinculo e continua identificado pelo nome.
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
