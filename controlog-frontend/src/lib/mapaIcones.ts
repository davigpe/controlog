import L from 'leaflet';

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
export function iconeColorido(cor: string, numero: number | undefined, anelDestaque = false) {
  const anel = anelDestaque ? 'outline:3px dashed #f59e0b;outline-offset:2px;' : '';
  return L.divIcon({
    className: 'mapa-marcador-colorido',
    html: `<div style="background:${cor};color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.45);border:2px solid #fff;${anel}">${numero ?? ''}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}
