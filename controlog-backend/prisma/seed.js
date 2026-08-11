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

  const [carlos, ana] = await Promise.all([
    prisma.motorista.upsert({
      where: { cnh: '12345678901' },
      update: {},
      create: { nome: 'Carlos Silva', cnh: '12345678901', telefone: '(47) 99111-1111' },
    }),
    prisma.motorista.upsert({
      where: { cnh: '23456789012' },
      update: {},
      create: { nome: 'Ana Souza', cnh: '23456789012', telefone: '(47) 99222-2222' },
    }),
  ]);

  const [sprinter, volvo] = await Promise.all([
    prisma.veiculo.upsert({
      where: { placa: 'ABC-1234' },
      update: {},
      create: { placa: 'ABC-1234', modelo: 'Mercedes Sprinter', capacidade: '1.500 kg' },
    }),
    prisma.veiculo.upsert({
      where: { placa: 'DEF-5678' },
      update: {},
      create: { placa: 'DEF-5678', modelo: 'Volvo FH', capacidade: '25.000 kg' },
    }),
  ]);

  const rota1 = await prisma.rota.upsert({
    where: { codigo: 'RT-001' },
    update: {},
    create: {
      codigo: 'RT-001',
      origem: 'Joinville, SC',
      destino: 'Florianópolis, SC',
      latOrigem: -26.3045,
      lngOrigem: -48.8487,
      latDestino: -27.5954,
      lngDestino: -48.548,
      status: 'ATIVA',
      dataHora: new Date(),
      motoristaId: carlos.id,
      veiculoId: sprinter.id,
    },
  });

  await prisma.rota.upsert({
    where: { codigo: 'RT-002' },
    update: {},
    create: {
      codigo: 'RT-002',
      origem: 'Curitiba, PR',
      destino: 'São Paulo, SP',
      latOrigem: -25.4284,
      lngOrigem: -49.2733,
      latDestino: -23.5505,
      lngDestino: -46.6333,
      status: 'CONCLUIDA',
      dataHora: new Date(Date.now() - 86400000),
      motoristaId: ana.id,
      veiculoId: volvo.id,
    },
  });

  await prisma.entrega.upsert({
    where: { codigo: 'EN-001' },
    update: {},
    create: {
      codigo: 'EN-001',
      destino: 'Florianópolis, SC',
      status: 'EM_TRANSITO',
      dataPrevista: new Date(Date.now() + 86400000),
      rotaId: rota1.id,
      motoristaId: carlos.id,
    },
  });

  console.log('Seed concluído.');
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
