import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}

const CIDADES = {
  joinville: { nome: 'Joinville, SC', lat: -26.3045, lng: -48.8487 },
  florianopolis: { nome: 'Florianópolis, SC', lat: -27.5954, lng: -48.548 },
  curitiba: { nome: 'Curitiba, PR', lat: -25.4284, lng: -49.2733 },
  saoPaulo: { nome: 'São Paulo, SP', lat: -23.5505, lng: -46.6333 },
  blumenau: { nome: 'Blumenau, SC', lat: -26.9194, lng: -49.0661 },
  portoAlegre: { nome: 'Porto Alegre, RS', lat: -30.0346, lng: -51.2177 },
  chapeco: { nome: 'Chapecó, SC', lat: -27.1004, lng: -52.6152 },
  itajai: { nome: 'Itajaí, SC', lat: -26.9078, lng: -48.6614 },
  balnearioCamboriu: { nome: 'Balneário Camboriú, SC', lat: -26.9906, lng: -48.6349 },
  criciuma: { nome: 'Criciúma, SC', lat: -28.6775, lng: -49.3697 },
};

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

  // ─── Rotas ──────────────────────────────────────────────────────────────
  // Espalhadas pelos últimos ~80 dias para os filtros de período dos
  // Relatórios (7d/30d/90d/tudo) mostrarem diferenças reais.
  const rotasSeed = [
    { codigo: 'RT-001', origem: 'joinville', destino: 'florianopolis', status: 'ATIVA', dias: 0, motorista: 'carlos', veiculo: 'sprinter' },
    { codigo: 'RT-002', origem: 'curitiba', destino: 'saoPaulo', status: 'CONCLUIDA', dias: 1, motorista: 'ana', veiculo: 'volvo' },
    { codigo: 'RT-003', origem: 'joinville', destino: 'blumenau', status: 'CONCLUIDA', dias: 5, motorista: 'pedro', veiculo: 'scania' },
    { codigo: 'RT-004', origem: 'florianopolis', destino: 'itajai', status: 'CONCLUIDA', dias: 8, motorista: 'juliana', veiculo: 'cargo' },
    { codigo: 'RT-005', origem: 'saoPaulo', destino: 'curitiba', status: 'CONCLUIDA', dias: 12, motorista: 'carlos', veiculo: 'sprinter' },
    { codigo: 'RT-006', origem: 'blumenau', destino: 'joinville', status: 'ATIVA', dias: 2, motorista: 'ana', veiculo: 'volvo' },
    { codigo: 'RT-007', origem: 'joinville', destino: 'portoAlegre', status: 'CANCELADA', dias: 15, motorista: 'roberto', veiculo: 'daily' },
    { codigo: 'RT-008', origem: 'chapeco', destino: 'florianopolis', status: 'CONCLUIDA', dias: 20, motorista: 'marcos', veiculo: 'scania' },
    { codigo: 'RT-009', origem: 'itajai', destino: 'balnearioCamboriu', status: 'CONCLUIDA', dias: 25, motorista: 'pedro', veiculo: 'cargo' },
    { codigo: 'RT-010', origem: 'florianopolis', destino: 'criciuma', status: 'CONCLUIDA', dias: 35, motorista: 'juliana', veiculo: 'sprinter' },
    { codigo: 'RT-011', origem: 'curitiba', destino: 'joinville', status: 'CONCLUIDA', dias: 45, motorista: 'carlos', veiculo: 'volvo' },
    { codigo: 'RT-012', origem: 'saoPaulo', destino: 'blumenau', status: 'CONCLUIDA', dias: 60, motorista: 'ana', veiculo: 'scania' },
    { codigo: 'RT-013', origem: 'joinville', destino: 'chapeco', status: 'CANCELADA', dias: 70, motorista: 'roberto', veiculo: 'daily' },
    { codigo: 'RT-014', origem: 'balnearioCamboriu', destino: 'saoPaulo', status: 'CONCLUIDA', dias: 80, motorista: 'marcos', veiculo: 'cargo' },
  ];

  const rotas = {};
  for (const r of rotasSeed) {
    const origem = CIDADES[r.origem];
    const destino = CIDADES[r.destino];
    rotas[r.codigo] = await prisma.rota.upsert({
      where: { codigo: r.codigo },
      update: {},
      create: {
        codigo: r.codigo,
        origem: origem.nome,
        destino: destino.nome,
        latOrigem: origem.lat,
        lngOrigem: origem.lng,
        latDestino: destino.lat,
        lngDestino: destino.lng,
        status: r.status,
        dataHora: daysAgo(r.dias),
        motoristaId: motoristas[r.motorista].id,
        veiculoId: veiculos[r.veiculo].id,
      },
    });
  }

  // ─── Entregas ───────────────────────────────────────────────────────────
  // "dias" negativo = data prevista no futuro (rotas ainda ativas).
  const entregasSeed = [
    { codigo: 'EN-001', rota: 'RT-001', motorista: 'carlos', destino: 'florianopolis', status: 'EM_TRANSITO', dias: -1 },
    { codigo: 'EN-002', rota: 'RT-002', motorista: 'ana', destino: 'saoPaulo', status: 'ENTREGUE', dias: 1 },
    { codigo: 'EN-003', rota: 'RT-003', motorista: 'pedro', destino: 'blumenau', status: 'ENTREGUE', dias: 5 },
    { codigo: 'EN-004', rota: 'RT-004', motorista: 'juliana', destino: 'itajai', status: 'ENTREGUE', dias: 8 },
    { codigo: 'EN-005', rota: 'RT-004', motorista: 'juliana', destino: 'itajai', status: 'ENTREGUE', dias: 8 },
    { codigo: 'EN-006', rota: 'RT-005', motorista: 'carlos', destino: 'curitiba', status: 'ENTREGUE', dias: 12 },
    { codigo: 'EN-007', rota: 'RT-006', motorista: 'ana', destino: 'joinville', status: 'EM_TRANSITO', dias: -1 },
    { codigo: 'EN-008', rota: 'RT-006', motorista: 'ana', destino: 'joinville', status: 'PENDENTE', dias: -2 },
    { codigo: 'EN-009', rota: 'RT-007', motorista: 'roberto', destino: 'portoAlegre', status: 'CANCELADA', dias: 15 },
    { codigo: 'EN-010', rota: 'RT-008', motorista: 'marcos', destino: 'florianopolis', status: 'ENTREGUE', dias: 20 },
    { codigo: 'EN-011', rota: 'RT-008', motorista: 'marcos', destino: 'florianopolis', status: 'ENTREGUE', dias: 20 },
    { codigo: 'EN-012', rota: 'RT-009', motorista: 'pedro', destino: 'balnearioCamboriu', status: 'ENTREGUE', dias: 25 },
    { codigo: 'EN-013', rota: 'RT-010', motorista: 'juliana', destino: 'criciuma', status: 'ENTREGUE', dias: 35 },
    { codigo: 'EN-014', rota: 'RT-011', motorista: 'carlos', destino: 'joinville', status: 'ENTREGUE', dias: 45 },
    { codigo: 'EN-015', rota: 'RT-012', motorista: 'ana', destino: 'blumenau', status: 'ENTREGUE', dias: 60 },
    { codigo: 'EN-016', rota: 'RT-013', motorista: 'roberto', destino: 'chapeco', status: 'CANCELADA', dias: 70 },
    { codigo: 'EN-017', rota: 'RT-014', motorista: 'marcos', destino: 'saoPaulo', status: 'ENTREGUE', dias: 80 },
    { codigo: 'EN-018', rota: 'RT-003', motorista: 'pedro', destino: 'blumenau', status: 'ENTREGUE', dias: 4 },
    { codigo: 'EN-019', rota: 'RT-009', motorista: 'pedro', destino: 'balnearioCamboriu', status: 'ENTREGUE', dias: 24 },
  ];

  for (const e of entregasSeed) {
    const destino = CIDADES[e.destino];
    await prisma.entrega.upsert({
      where: { codigo: e.codigo },
      update: {},
      create: {
        codigo: e.codigo,
        destino: destino.nome,
        status: e.status,
        dataPrevista: daysAgo(e.dias),
        dataEfetiva: e.status === 'ENTREGUE' ? daysAgo(e.dias) : null,
        rotaId: rotas[e.rota].id,
        motoristaId: motoristas[e.motorista].id,
      },
    });
  }

  console.log(`Seed concluído: ${motoristasSeed.length} motoristas, ${veiculosSeed.length} veículos, ${rotasSeed.length} rotas, ${entregasSeed.length} entregas.`);
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
