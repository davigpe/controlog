import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix ícone padrão do Leaflet com Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Tipagem de um ponto no mapa
export interface MapPoint {
  id: string | number
  lat: number
  lng: number
  label: string
  description?: string
}

interface MapViewProps {
  points?: MapPoint[]
  center?: [number, number]
  zoom?: number
  height?: string
}

export function MapView({
  points = [],
  center = [-23.5505, -46.6333], // São Paulo como padrão
  zoom = 12,
  height = '500px',
}: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.map((point) => (
        <Marker key={point.id} position={[point.lat, point.lng]}>
          <Popup>
            <strong>{point.label}</strong>
            {point.description && <p>{point.description}</p>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
