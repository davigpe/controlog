-- CreateEnum
CREATE TYPE "MotivoInsucesso" AS ENUM ('CLIENTE_AUSENTE', 'ENDERECO_NAO_ENCONTRADO', 'RECUSADA_PELO_CLIENTE', 'AVARIA', 'OUTRO');

-- AlterEnum
ALTER TYPE "EntregaStatus" ADD VALUE 'NAO_ENTREGUE';

-- AlterTable
ALTER TABLE "entregas" ADD COLUMN     "motivo_insucesso" "MotivoInsucesso",
ADD COLUMN     "observacao" TEXT;
