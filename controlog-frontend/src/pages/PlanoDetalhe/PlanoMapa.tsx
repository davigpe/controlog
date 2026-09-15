import { useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { aplicarFixIconesLeaflet } from '@/lib/leafletIconFix';
import { depositoIcon, iconeColorido } from '@/lib/mapaIcones';
import type { Coordenada, ResultadoOtimizacao } from '@/pages/OtimizacaoRotas/types';
import type { Pedido } from '@/pages/Pedidos/types';

aplicarFixIconesLeaflet();

export interface GrupoNoMapa {
  indice: number;
  cor: string;
  pedidos: Pedido[];
  resultado: ResultadoOtimizacao | null;
}

interface Props {
  origem: Coordenada;
  grupos: GrupoNoMapa[];
}

export default function PlanoMapa({ origem, grupos }: Props) {
  const [bounds] = useState<[number, number][]>(() => [
    [origem.lat, origem.lng],
    ...grupos.flatMap((grupo) => grupo.pedidos.map((p): [number, number] => [p.lat, p.lng])),
  ]);

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

      {grupos.flatMap((grupo) => {
        const ordemPorId = new Map((grupo.resultado?.ordem ?? []).map((p) => [p.id, p.posicao]));

        return grupo.pedidos.map((pedido) => (
          <Marker
            key={pedido.id}
            position={[pedido.lat, pedido.lng]}
            icon={iconeColorido(grupo.cor, ordemPorId.get(pedido.id))}
          >
            <Popup>
              {pedido.endereco} — Rota {grupo.indice}
            </Popup>
          </Marker>
        ));
      })}

      {grupos.map((grupo) => {
        if (grupo.pedidos.length === 0) return null;

        const linha: [number, number][] =
          grupo.resultado?.rotaReal?.pontos ??
          [
            [origem.lat, origem.lng],
            ...(grupo.resultado?.ordem.map((p): [number, number] => [p.lat, p.lng]) ??
              grupo.pedidos.map((p): [number, number] => [p.lat, p.lng])),
          ];

        return (
          <Polyline
            key={grupo.indice}
            positions={linha}
            color={grupo.cor}
            weight={3}
            dashArray={grupo.resultado?.rotaReal ? undefined : '8, 8'}
          />
        );
      })}
    </MapContainer>
  );
}
