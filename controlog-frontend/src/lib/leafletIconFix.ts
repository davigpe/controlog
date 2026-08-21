import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let aplicado = false;

// O bundler do Vite quebra a resolução dos ícones padrão do Leaflet (ele tenta
// carregar os .png via um caminho relativo que não existe no build). Como
// workaround, removemos o resolvedor padrão e apontamos para os ícones via CDN.
export function aplicarFixIconesLeaflet() {
  if (aplicado) return;
  aplicado = true;

  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}
