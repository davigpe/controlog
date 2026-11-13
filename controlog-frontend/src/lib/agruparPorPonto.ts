/**
 * Agrupa itens que caem na mesma coordenada.
 *
 * Existe porque o mesmo cliente compra mais de uma vez: desde que os pedidos
 * nascem no endereço cadastrado, vários deles coincidem exatamente no mapa. Sem
 * agrupar, o Leaflet empilha os marcadores um sobre o outro — a tela mostra um
 * pino onde há quatro pedidos, e a diferença é invisível.
 */

/** Casas decimais do agrupamento: a sexta vale cerca de 11 cm. */
const CASAS = 6;

export function chaveDoPonto(lat: number, lng: number): string {
  // Arredondar em vez de comparar os números crus: pedidos do mesmo cliente têm
  // hoje coordenada idêntica, mas um valor vindo de outra origem (importação,
  // geocodificação refeita) pode diferir na última casa e criar dois pinos
  // sobrepostos que deveriam ser um.
  return `${lat.toFixed(CASAS)},${lng.toFixed(CASAS)}`;
}

export interface PontoAgrupado<T> {
  chave: string;
  lat: number;
  lng: number;
  itens: T[];
}

export function agruparPorPonto<T extends { lat: number; lng: number }>(
  itens: T[]
): PontoAgrupado<T>[] {
  const mapa = new Map<string, PontoAgrupado<T>>();

  for (const item of itens) {
    const chave = chaveDoPonto(item.lat, item.lng);
    const existente = mapa.get(chave);
    if (existente) {
      existente.itens.push(item);
    } else {
      // Guarda a coordenada do primeiro item, não a arredondada: o
      // arredondamento serve para agrupar, não para mover o pino.
      mapa.set(chave, { chave, lat: item.lat, lng: item.lng, itens: [item] });
    }
  }

  return [...mapa.values()];
}
