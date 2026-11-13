import L from 'leaflet';

/** Cinza do marcador de pedido selecionado, e âmbar do polígono em desenho. */
export const CINZA_SELECAO = '#6b7280';
export const COR_DESENHO = '#f59e0b';

/**
 * Pedido fora de qualquer rota — ícone explícito, em vez de depender do
 * ícone padrão implícito do Leaflet.
 */
export const pedidoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export const depositoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

/**
 * Marcador colorido numerado (posição na rota). `anelDestaque` desenha um
 * anel tracejado por cima sinalizando seleção, sem esconder a cor real por
 * baixo — usado pela Otimização de Rotas pra indicar pedidos selecionados.
 */
export function iconeColorido(
  cor: string,
  numero: number | undefined,
  anelDestaque = false,
  /**
   * Quantos pedidos existem neste mesmo ponto. Acima de 1, o marcador ganha um
   * contador no canto: sem ele, quatro pedidos no mesmo endereço aparecem como
   * um pino só, porque o Leaflet simplesmente empilha os marcadores.
   */
  quantidade = 1
) {
  const anel = anelDestaque ? 'outline:3px dashed #f59e0b;outline-offset:2px;' : '';
  const contador =
    quantidade > 1
      ? `<span style="position:absolute;top:-6px;right:-7px;background:#111827;color:#fff;border:2px solid #fff;border-radius:9999px;min-width:18px;height:18px;padding:0 4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;line-height:1;box-sizing:content-box;">${quantidade}</span>`
      : '';
  return L.divIcon({
    className: 'mapa-marcador-colorido',
    html: `<div style="position:relative;background:${cor};color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.45);border:2px solid #fff;${anel}">${numero ?? ''}${contador}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/**
 * Marcador de pedido sem rota, com contador quando há mais de um no ponto.
 *
 * O `pedidoIcon` é uma imagem fixa e não comporta contador, então pontos com
 * mais de um pedido usam esta versão desenhada.
 */
export function iconePedidoAgrupado(quantidade: number, anelDestaque = false) {
  return iconeColorido('#2563eb', undefined, anelDestaque, quantidade);
}
