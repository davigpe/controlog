import type { Coordenada, Pedido } from './types';

// Centro de distribuição simulado — mesma coordenada usada nos dados de
// exemplo do resto do projeto (Joinville, SC).
export const DEPOSITO: Coordenada = { lat: -26.3045, lng: -48.8487 };

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

export interface Bairro {
  nome: string;
  lat: number;
  lng: number;
}

// Coordenadas aproximadas (a partir de ruas reais de cada bairro) usadas só
// para posicionar os pedidos fictícios de forma coerente com o nome do
// bairro sorteado. Não é geocoding real (o projeto não usa serviço externo
// pra isso) — é uma aproximação suficiente pra simulação não cair na baía
// nem gerar endereço que não bate com o ponto no mapa.
export const BAIRROS: Bairro[] = [
  { nome: 'Centro', lat: -26.3044, lng: -48.8464 },
  { nome: 'América', lat: -26.292, lng: -48.856 },
  { nome: 'Anita Garibaldi', lat: -26.3195, lng: -48.8497 },
  { nome: 'Bucarein', lat: -26.316, lng: -48.84 },
  { nome: 'Costa e Silva', lat: -26.276, lng: -48.846 },
  { nome: 'Glória', lat: -26.29, lng: -48.875 },
  { nome: 'Iririú', lat: -26.273, lng: -48.827 },
  { nome: 'Saguaçu', lat: -26.285, lng: -48.839 },
];

interface OpcoesGeracao {
  /** Raio (km) de espalhamento dos pedidos ao redor do centro do bairro sorteado. */
  raioKm?: number;
  /** Gerador de números aleatórios injetável (padrão Math.random) — permite testes determinísticos. */
  rng?: () => number;
}

function escolher<T>(lista: T[], rng: () => number): T {
  return lista[Math.floor(rng() * lista.length)];
}

// Gera pedidos ao redor do centro de bairros reais de Joinville — cada
// pedido sorteia um bairro e é espalhado (raio ~ sqrt(rng), evitando
// concentração no centro) num raio pequeno ao redor da coordenada desse
// bairro, então o endereço exibido sempre corresponde à posição no mapa.
export function gerarPedidos(quantidade: number, opcoes: OpcoesGeracao = {}): Pedido[] {
  const { raioKm = RAIO_KM_PADRAO, rng = Math.random } = opcoes;

  const pedidos: Pedido[] = [];
  for (let i = 0; i < quantidade; i++) {
    const bairro = escolher(BAIRROS, rng);
    const kmPorGrauLongitude = KM_POR_GRAU_LATITUDE * Math.cos((bairro.lat * Math.PI) / 180);

    const angulo = rng() * 2 * Math.PI;
    const distanciaKm = Math.sqrt(rng()) * raioKm;

    const lat = bairro.lat + (distanciaKm * Math.cos(angulo)) / KM_POR_GRAU_LATITUDE;
    const lng = bairro.lng + (distanciaKm * Math.sin(angulo)) / kmPorGrauLongitude;
    const numero = Math.floor(rng() * 2000) + 1;

    pedidos.push({
      id: `pedido-${i + 1}`,
      lat,
      lng,
      endereco: `${escolher(RUAS, rng)}, ${numero} - ${bairro.nome}`,
    });
  }

  return pedidos;
}
