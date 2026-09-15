import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash('controlog123', 12);

  const gestor = await prisma.usuario.upsert({
    where: { email: 'gestor@controlog.com' },
    update: {},
    create: {
      nome: 'Ricardo Menezes',
      email: 'gestor@controlog.com',
      senhaHash,
      perfil: 'GESTOR',
    },
  });

  // ─── Motoristas ─────────────────────────────────────────────────────────
  const motoristasSeed = [
    { key: 'carlos', nome: 'Carlos Silva', cnh: '12345678901', telefone: '(47) 99111-1111' },
    { key: 'ana', nome: 'Ana Souza', cnh: '23456789012', telefone: '(47) 99222-2222' },
    { key: 'pedro', nome: 'Pedro Lima', cnh: '34567890123', telefone: '(47) 99333-3333' },
    { key: 'juliana', nome: 'Juliana Ferreira', cnh: '45678901234', telefone: '(47) 99444-4444' },
    { key: 'roberto', nome: 'Roberto Alves', cnh: '56789012345', telefone: '(47) 99555-5555' },
    { key: 'marcos', nome: 'Marcos Oliveira', cnh: '67890123456', telefone: '(47) 99666-6666' },
    { key: 'fernanda', nome: 'Fernanda Costa', cnh: '78901234567', telefone: '(47) 99777-7777', status: 'INATIVO' },
  ];

  const motoristas = {};
  for (const m of motoristasSeed) {
    motoristas[m.key] = await prisma.motorista.upsert({
      where: { cnh: m.cnh },
      update: {},
      create: { nome: m.nome, cnh: m.cnh, telefone: m.telefone, status: m.status ?? 'ATIVO' },
    });
  }

  // ─── Veículos ───────────────────────────────────────────────────────────
  const veiculosSeed = [
    { key: 'sprinter', placa: 'ABC-1234', modelo: 'Mercedes Sprinter', capacidade: '1.500 kg' },
    { key: 'volvo', placa: 'DEF-5678', modelo: 'Volvo FH', capacidade: '25.000 kg' },
    { key: 'scania', placa: 'GHI-9012', modelo: 'Scania R450', capacidade: '30.000 kg' },
    { key: 'cargo', placa: 'JKL-3456', modelo: 'Ford Cargo 1723', capacidade: '8.000 kg' },
    { key: 'constellation', placa: 'MNO-7890', modelo: 'VW Constellation 24.280', capacidade: '15.000 kg', status: 'MANUTENCAO' },
    { key: 'daily', placa: 'PQR-1122', modelo: 'Iveco Daily', capacidade: '1.800 kg' },
  ];

  const veiculos = {};
  for (const v of veiculosSeed) {
    veiculos[v.key] = await prisma.veiculo.upsert({
      where: { placa: v.placa },
      update: {},
      create: { placa: v.placa, modelo: v.modelo, capacidade: v.capacidade, status: v.status ?? 'DISPONIVEL' },
    });
  }

  // Rotas e entregas não são mais seedadas fictíciamente — passaram a ser
  // dado real, criado só quando o usuário aprova uma rota otimizada no
  // módulo de Pedidos/Planos (ver Plano.aprovarRota). A página de Rotas
  // mostra só o que foi de fato aprovado.

  console.log(`Seed concluído: ${motoristasSeed.length} motoristas, ${veiculosSeed.length} veículos.`);
  console.log(`Login de teste -> email: ${gestor.email} | senha: controlog123`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
