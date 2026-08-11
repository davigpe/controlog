-- CreateEnum
CREATE TYPE "UsuarioPerfil" AS ENUM ('GESTOR', 'OPERADOR', 'MOTORISTA');

-- CreateEnum
CREATE TYPE "MotoristaStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "VeiculoStatus" AS ENUM ('DISPONIVEL', 'MANUTENCAO', 'INATIVO');

-- CreateEnum
CREATE TYPE "RotaStatus" AS ENUM ('ATIVA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EntregaStatus" AS ENUM ('PENDENTE', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "UsuarioPerfil" NOT NULL DEFAULT 'OPERADOR',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motoristas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnh" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "status" "MotoristaStatus" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "capacidade" TEXT NOT NULL,
    "status" "VeiculoStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "lat_origem" DOUBLE PRECISION NOT NULL,
    "lng_origem" DOUBLE PRECISION NOT NULL,
    "lat_destino" DOUBLE PRECISION NOT NULL,
    "lng_destino" DOUBLE PRECISION NOT NULL,
    "status" "RotaStatus" NOT NULL DEFAULT 'ATIVA',
    "data_hora" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motorista_id" TEXT NOT NULL,
    "veiculo_id" TEXT NOT NULL,

    CONSTRAINT "rotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "status" "EntregaStatus" NOT NULL DEFAULT 'PENDENTE',
    "data_prevista" TIMESTAMP(3) NOT NULL,
    "data_efetiva" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rota_id" TEXT NOT NULL,
    "motorista_id" TEXT NOT NULL,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_cnh_key" ON "motoristas"("cnh");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "rotas_codigo_key" ON "rotas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_codigo_key" ON "entregas"("codigo");

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
