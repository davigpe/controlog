import { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { aplicarFixIconesLeaflet } from '@/lib/leafletIconFix';
import { pedidosNaoAtribuidos, type RotaSimulada } from './rotasSimuladas';
import type { Coordenada, Pedido } from './types';

aplicarFixIconesLeaflet();

const CINZA_SELECAO = '#6b7280';
const COR_DESENHO = '#f59e0b';

const depositoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Marcador dos pedidos não atribuídos e não selecionados — ícone explícito,
// em vez de depender do ícone padrão implícito do Leaflet.
const pedidoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Marcador colorido (rota atribuída, ou pedido selecionado em cinza) — um
// anel tracejado por cima sinaliza seleção sem esconder a cor real por
// baixo, importante pra saber a que rota um pedido selecionado já pertence.
function iconeColorido(cor: string, numero: number | undefined, selecionado: boolean) {
  const anel = selecionado ? `outline:3px dashed ${COR_DESENHO};outline-offset:2px;` : '';
  return L.divIcon({
    className: 'otimizacao-rotas-marcador-colorido',
    html: `<div style="background:${cor};color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.45);border:2px solid #fff;${anel}">${numero ?? ''}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function assinaturaBounds(bounds: [number, number][]): string {
  return bounds.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(';');
}

// MapContainer.bounds só é lido no mount — não reage a mudanças depois. Pra
// re-enquadrar quando o foco de rota muda, precisa de um efeito imperativo
// via a instância do mapa (useMap), amarrado a uma assinatura estável (não
// ao array em si, que muda de referência a cada render).
function AjustarBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  const assinatura = assinaturaBounds(bounds);

  useEffect(() => {
    if (bounds.length === 0) return;
    map.fitBounds(bounds, { padding: [30, 30] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura]);

  return null;
}

// Captura cliques no mapa pra desenhar o polígono, e desliga o zoom por
// duplo-clique enquanto isso (senão dois cliques rápidos de vértice
// próximos no tempo dão zoom sem querer). doubleClickZoom também só vale
// como prop estática no mount, precisa ser imperativo.
function CapturaCliqueDesenho({
  ativo,
  onClique,
}: {
  ativo: boolean;
  onClique: (ponto: Coordenada) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (ativo) onClique({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  useEffect(() => {
    if (ativo) {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }
  }, [ativo, map]);

  return null;
}

interface Props {
  origem: Coordenada;
  todosPedidos: Pedido[];
  rotas: RotaSimulada[];
  pedidosSelecionadosIds: Set<string>;
  rotaEmFocoId?: string | null;
  modoDesenho: boolean;
  pontosPoligono: Coordenada[];
  onCliqueMapa: (ponto: Coordenada) => void;
}

export default function OtimizacaoRotasMapa({
  origem,
  todosPedidos,
  rotas,
  pedidosSelecionadosIds,
  rotaEmFocoId,
  modoDesenho,
  pontosPoligono,
  onCliqueMapa,
}: Props) {
  const [boundsIniciais] = useState<[number, number][]>(() =>
    [origem, ...todosPedidos].map((p): [number, number] => [p.lat, p.lng])
  );

  const pedidosPorId = useMemo(() => new Map(todosPedidos.map((p) => [p.id, p])), [todosPedidos]);
  const naoAtribuidos = useMemo(() => pedidosNaoAtribuidos(todosPedidos, rotas), [todosPedidos, rotas]);

  const boundsFoco = useMemo<[number, number][]>(() => {
    const rotaFocada = rotaEmFocoId ? rotas.find((r) => r.id === rotaEmFocoId) : undefined;
    // Rota focada sem nenhum pedido (ex.: acabou de ficar vazia por uma
    // reatribuição) — enquadrar só a origem daria zoom máximo num ponto só,
    // então cai pro conjunto completo em vez de "focar" em nada.
    if (!rotaFocada || rotaFocada.pedidoIds.length === 0) {
      return [origem, ...todosPedidos].map((p) => [p.lat, p.lng]);
    }

    const pontosRota = rotaFocada.pedidoIds
      .map((id) => pedidosPorId.get(id))
      .filter((p): p is Pedido => Boolean(p));
    return [origem, ...pontosRota].map((p) => [p.lat, p.lng]);
  }, [rotaEmFocoId, rotas, todosPedidos, origem, pedidosPorId]);

  return (
    <MapContainer
      bounds={boundsIniciais}
      boundsOptions={{ padding: [30, 30] }}
      style={{ height: '420px', width: '100%', borderRadius: '8px', cursor: modoDesenho ? 'crosshair' : undefined }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AjustarBounds bounds={boundsFoco} />
      <CapturaCliqueDesenho ativo={modoDesenho} onClique={onCliqueMapa} />

      <Marker position={[origem.lat, origem.lng]} icon={depositoIcon} interactive={!modoDesenho}>
        <Popup>🏭 Centro de Distribuição</Popup>
      </Marker>

      {naoAtribuidos.map((pedido) => {
        const selecionado = pedidosSelecionadosIds.has(pedido.id);
        return (
          <Marker
            key={pedido.id}
            position={[pedido.lat, pedido.lng]}
            icon={selecionado ? iconeColorido(CINZA_SELECAO, undefined, true) : pedidoIcon}
            interactive={!modoDesenho}
          >
            <Popup>{pedido.endereco}</Popup>
          </Marker>
        );
      })}

      {rotas.flatMap((rota) => {
        const emFoco = !rotaEmFocoId || rotaEmFocoId === rota.id;
        const ordemPorId = new Map((rota.resultado?.ordem ?? []).map((p) => [p.id, p.posicao]));

        return rota.pedidoIds.map((id) => {
          const pedido = pedidosPorId.get(id);
          if (!pedido) return null;
          const selecionado = pedidosSelecionadosIds.has(id);

          return (
            <Marker
              key={id}
              position={[pedido.lat, pedido.lng]}
              icon={iconeColorido(rota.cor, ordemPorId.get(id), selecionado)}
              opacity={emFoco ? 1 : 0.35}
              interactive={!modoDesenho}
            >
              <Popup>
                {pedido.endereco} — {rota.nome}
              </Popup>
            </Marker>
          );
        });
      })}

      {rotas
        .filter((rota) => rota.resultado && rota.pedidoIds.length > 0)
        .map((rota) => {
          const resultado = rota.resultado!;
          const linha: [number, number][] =
            resultado.rotaReal?.pontos ??
            [[origem.lat, origem.lng], ...resultado.ordem.map((p): [number, number] => [p.lat, p.lng])];
          const emFoco = !rotaEmFocoId || rotaEmFocoId === rota.id;

          return (
            <Polyline
              key={rota.id}
              positions={linha}
              color={rota.cor}
              weight={3}
              opacity={emFoco ? 1 : 0.25}
              dashArray={resultado.rotaReal ? undefined : '8, 8'}
            />
          );
        })}

      {modoDesenho && pontosPoligono.length > 0 && (
        <>
          <Polygon
            positions={pontosPoligono.map((p): [number, number] => [p.lat, p.lng])}
            pathOptions={{ color: COR_DESENHO, dashArray: '4, 4', fillOpacity: 0.1 }}
          />
          {pontosPoligono.map((p, indice) => (
            <CircleMarker
              key={indice}
              center={[p.lat, p.lng]}
              radius={5}
              pathOptions={{ color: COR_DESENHO, fillColor: COR_DESENHO, fillOpacity: 1 }}
            />
          ))}
        </>
      )}
    </MapContainer>
  );
}
