import { randomUUID } from 'node:crypto';
import { paginationArgs, paginationMeta } from '../utils/pagination.js';

const RAIO_KM_PADRAO = 1.3;
const KM_POR_GRAU_LATITUDE = 111.32;

const RUAS = [
  'Rua das Palmeiras',
  'Av. Getúlio Vargas',
  'Rua XV de Novembro',
  'Rua Dona Francisca',
  'Av. Santos Dumont',
  'Rua Blumenau',
  'Rua São Paulo',
  'Av. Juscelino Kubitschek',
  'Rua Anita Garibaldi',
  'Rua Marechal Deodoro',
];

const CLIENTES = [
  'Mercado Bom Preço',
  'Farmácia Vida',
  'Auto Peças União',
  'Supermercado Ideal',
  'Loja Center Móveis',
  'Distribuidora Sul',
  'Comércio Estrela',
  'Atacado Popular',
  'Mercearia Cantinho',
  'Ferragens Rocha',
];

// Mesmas coordenadas aproximadas de bairros reais de Joinville usadas em
// controlog-frontend/src/pages/OtimizacaoRotas/gerarPedidos.ts — mantém os
// pedidos fictícios coerentes com bairro/endereço sem geocoding real.
const BAIRROS = [
  { nome: 'Centro', lat: -26.3044, lng: -48.8464 },
  { nome: 'América', lat: -26.292, lng: -48.856 },
  { nome: 'Anita Garibaldi', lat: -26.3195, lng: -48.8497 },
  { nome: 'Bucarein', lat: -26.316, lng: -48.84 },
  { nome: 'Costa e Silva', lat: -26.276, lng: -48.846 },
  { nome: 'Glória', lat: -26.29, lng: -48.875 },
  { nome: 'Iririú', lat: -26.273, lng: -48.827 },
  { nome: 'Saguaçu', lat: -26.285, lng: -48.839 },
];

function escolher(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function gerarUmPedido() {
  const bairro = escolher(BAIRROS);
  const kmPorGrauLongitude = KM_POR_GRAU_LATITUDE * Math.cos((bairro.lat * Math.PI) / 180);

  const angulo = Math.random() * 2 * Math.PI;
  const distanciaKm = Math.sqrt(Math.random()) * RAIO_KM_PADRAO;

  const lat = bairro.lat + (distanciaKm * Math.cos(angulo)) / KM_POR_GRAU_LATITUDE;
  const lng = bairro.lng + (distanciaKm * Math.sin(angulo)) / kmPorGrauLongitude;
  const numero = Math.floor(Math.random() * 2000) + 1;

  return {
    codigo: `PED-${randomUUID().slice(0, 8).toUpperCase()}`,
    cliente: escolher(CLIENTES),
    endereco: `${escolher(RUAS)}, ${numero}`,
    cidade: bairro.nome,
    lat,
    lng,
    unidades: Math.floor(Math.random() * 20) + 1,
    volumeM3: Math.round((Math.random() * 0.9 + 0.1) * 100) / 100,
  };
}

export function createPedidoService(prisma) {
  return {
    async gerar({ quantidade }) {
      const dados = Array.from({ length: quantidade }, gerarUmPedido);
      await prisma.pedido.createMany({ data: dados });
      const codigos = dados.map((p) => p.codigo);
      return prisma.pedido.findMany({ where: { codigo: { in: codigos } }, orderBy: { criadoEm: 'asc' } });
    },

    async list({ disponivel, page = 1, pageSize = 10 } = {}) {
      const where = disponivel ? { planoId: null } : {};

      const [pedidos, total] = await Promise.all([
        prisma.pedido.findMany({
          where,
          orderBy: { criadoEm: 'desc' },
          ...paginationArgs({ page, pageSize }),
        }),
        prisma.pedido.count({ where }),
      ]);

      return { items: pedidos, pagination: paginationMeta({ page, pageSize, total }) };
    },
  };
}
