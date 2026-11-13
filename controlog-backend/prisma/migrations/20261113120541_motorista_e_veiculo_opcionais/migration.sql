-- AlterTable
ALTER TABLE "entregas" ALTER COLUMN "motorista_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "rotas" ADD COLUMN     "veiculo_proprio" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "motorista_id" DROP NOT NULL,
ALTER COLUMN "veiculo_id" DROP NOT NULL;

-- Invariante: veiculo proprio e veiculo da frota sao mutuamente exclusivos.
-- Vai no banco, e nao so no service, porque e uma regra sobre a forma do dado:
-- uma rota com veiculo_proprio verdadeiro E veiculo_id preenchido nao tem
-- leitura possivel, e nenhuma tela saberia qual dos dois mostrar. Constraint
-- criada dentro da migration, entao o shadow database do Prisma tambem a tem e
-- nao ha deteccao de drift nas migrations seguintes.
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_veiculo_proprio_sem_frota"
  CHECK (NOT ("veiculo_proprio" AND "veiculo_id" IS NOT NULL));
