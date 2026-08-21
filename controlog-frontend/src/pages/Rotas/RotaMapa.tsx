import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { aplicarFixIconesLeaflet } from '@/lib/leafletIconFix';
import type { Rota } from './types';

aplicarFixIconesLeaflet();

const origemIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const destinoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Props {
  rota: Rota;
}

export default function RotaMapa({ rota }: Props) {
  const centro: [number, number] = [
    (rota.coordenadasOrigem[0] + rota.coordenadasDestino[0]) / 2,
    (rota.coordenadasOrigem[1] + rota.coordenadasDestino[1]) / 2,
  ];

  return (
    <MapContainer
      center={centro}
      zoom={7}
      style={{ height: '350px', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={rota.coordenadasOrigem} icon={origemIcon}>
        <Popup>🟢 Origem: {rota.origem}</Popup>
      </Marker>

      <Marker position={rota.coordenadasDestino} icon={destinoIcon}>
        <Popup>🔴 Destino: {rota.destino}</Popup>
      </Marker>

      <Polyline
        positions={[rota.coordenadasOrigem, rota.coordenadasDestino]}
        color="#3b82f6"
        weight={3}
        dashArray="8, 8"
      />
    </MapContainer>
  );
}
