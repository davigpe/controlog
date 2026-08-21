import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { aplicarFixIconesLeaflet } from '@/lib/leafletIconFix';
import type { Coordenada, ParadaOtimizada, Pedido } from './types';

aplicarFixIconesLeaflet();

const depositoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function iconeNumerado(numero: number) {
  return L.divIcon({
    className: 'otimizacao-rotas-marcador-numerado',
    html: `<div style="background:#2563eb;color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.45);border:2px solid #fff;">${numero}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

interface Props {
  origem: Coordenada;
  pedidos: Pedido[];
  ordem?: ParadaOtimizada[];
}

export default function OtimizacaoRotasMapa({ origem, pedidos, ordem }: Props) {
  const bounds: [number, number][] = [origem, ...pedidos].map((p) => [p.lat, p.lng]);
  const paradas: (Pedido | ParadaOtimizada)[] = ordem ?? pedidos;
  const linha: [number, number][] = ordem
    ? [[origem.lat, origem.lng], ...ordem.map((p): [number, number] => [p.lat, p.lng])]
    : [];

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [30, 30] }}
      style={{ height: '420px', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[origem.lat, origem.lng]} icon={depositoIcon}>
        <Popup>🏭 Centro de Distribuição</Popup>
      </Marker>

      {paradas.map((pedido) => (
        <Marker
          key={pedido.id}
          position={[pedido.lat, pedido.lng]}
          icon={'posicao' in pedido ? iconeNumerado(pedido.posicao) : undefined}
        >
          <Popup>
            {'posicao' in pedido ? `${pedido.posicao}ª parada — ` : ''}
            {pedido.endereco}
          </Popup>
        </Marker>
      ))}

      {linha.length > 0 && <Polyline positions={linha} color="#2563eb" weight={3} />}
    </MapContainer>
  );
}
