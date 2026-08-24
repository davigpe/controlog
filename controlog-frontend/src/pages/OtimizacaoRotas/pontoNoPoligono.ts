import type { Coordenada, Pedido } from './types';

// Ray-casting clássico: lança um raio horizontal a partir do ponto e conta
// quantas arestas do polígono ele cruza — ímpar significa dentro. Sem
// dependência nova (nem turf, que não está instalado no projeto).
export function pontoDentroDoPoligono(ponto: Coordenada, poligono: Coordenada[]): boolean {
  if (poligono.length < 3) return false;

  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const vi = poligono[i];
    const vj = poligono[j];

    const cruza =
      vi.lat > ponto.lat !== vj.lat > ponto.lat &&
      ponto.lng < ((vj.lng - vi.lng) * (ponto.lat - vi.lat)) / (vj.lat - vi.lat) + vi.lng;

    if (cruza) dentro = !dentro;
  }

  return dentro;
}

export function pedidosDentroDoPoligono(pedidos: Pedido[], poligono: Coordenada[]): Pedido[] {
  if (poligono.length < 3) return [];
  return pedidos.filter((pedido) => pontoDentroDoPoligono(pedido, poligono));
}
