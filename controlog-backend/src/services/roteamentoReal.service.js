import { env } from '../config/env.js';

const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
const TIMEOUT_MS = 8000;

// Busca o traçado real pelas ruas via OpenRouteService (serviço externo
// gratuito, precisa de ORS_API_KEY configurada). Nunca lança erro — se a
// chave não estiver configurada, a API estiver fora do ar, o limite de
// requisições for atingido ou a resposta vier em formato inesperado, retorna
// null e quem chamou cai de volta pra estimativa em linha reta.
export async function obterRotaReal({
  origem,
  pontosOrdenados,
  apiKey = env.orsApiKey,
  fetchImpl = fetch,
}) {
  if (!apiKey || pontosOrdenados.length === 0) return null;

  const coordinates = [origem, ...pontosOrdenados].map((ponto) => [ponto.lng, ponto.lat]);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetchImpl(ORS_DIRECTIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates }),
      signal: controller.signal,
    });

    if (!resposta.ok) return null;

    const geojson = await resposta.json();
    const feature = geojson?.features?.[0];
    if (!feature) return null;

    return {
      pontos: feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanciaRealKm: feature.properties.summary.distance / 1000,
      duracaoMinutos: feature.properties.summary.duration / 60,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
