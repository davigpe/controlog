-- Categoria operacional do veículo (VUC, van, truck...), pedida na avaliação
-- com usuários da área de logística: a frota real se organiza por porte, não
-- só por modelo e capacidade em texto.

-- CreateEnum
CREATE TYPE "VeiculoCategoria" AS ENUM ('MOTO', 'PASSEIO', 'UTILITARIO', 'VAN', 'VUC', 'TRES_QUARTOS', 'TOCO', 'TRUCK', 'CARRETA', 'OUTRO');

-- AlterTable
-- NOT NULL com DEFAULT: as linhas existentes caem em OUTRO ("não
-- categorizado") em vez de receberem um palpite de categoria.
ALTER TABLE "veiculos" ADD COLUMN "categoria" "VeiculoCategoria" NOT NULL DEFAULT 'OUTRO';
