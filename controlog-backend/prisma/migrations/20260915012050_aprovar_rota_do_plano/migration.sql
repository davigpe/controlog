-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "rota_id" TEXT;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
