import type { Coordenada, Pedido } from './types';

// Centro de distribuição simulado — mesma coordenada usada nos dados de
// exemplo do resto do projeto (Joinville, SC).
export const DEPOSITO: Coordenada = { lat: -26.3045, lng: -48.8487 };

const RAIO_KM_PADRAO = 15;
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

const BAIRROS = ['Centro', 'América', 'Anita Garibaldi', 'Bucarein', 'Costa e Silva', 'Glória', 'Iririú', 'Saguaçu'];

interface OpcoesGeracao {
  raioKm?: number;
  /** Gerador de números aleatórios injetável (padrão Math.random) — permite testes determinísticos. */
  rng?: () => number;
}

function escolher<T>(lista: T[], rng: () => number): T {
  return lista[Math.floor(rng() * lista.length)];
}

// Gera pedidos com coordenadas espalhadas uniformemente num disco ao redor da
// origem (amostragem por raio ~ sqrt(rng), evitando concentração no centro).
export function gerarPedidos(quantidade: number, origem: Coordenada, opcoes: OpcoesGeracao = {}): Pedido[] {
  const { raioKm = RAIO_KM_PADRAO, rng = Math.random } = opcoes;
  const kmPorGrauLongitude = KM_POR_GRAU_LATITUDE * Math.cos((origem.lat * Math.PI) / 180);

  const pedidos: Pedido[] = [];
  for (let i = 0; i < quantidade; i++) {
    const angulo = rng() * 2 * Math.PI;
    const distanciaKm = Math.sqrt(rng()) * raioKm;

    const lat = origem.lat + (distanciaKm * Math.cos(angulo)) / KM_POR_GRAU_LATITUDE;
    const lng = origem.lng + (distanciaKm * Math.sin(angulo)) / kmPorGrauLongitude;
    const numero = Math.floor(rng() * 2000) + 1;

    pedidos.push({
      id: `pedido-${i + 1}`,
      lat,
      lng,
      endereco: `${escolher(RUAS, rng)}, ${numero} - ${escolher(BAIRROS, rng)}`,
    });
  }

  return pedidos;
}
