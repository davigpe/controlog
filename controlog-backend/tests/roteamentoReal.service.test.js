import { jest } from '@jest/globals';
import { obterRotaReal } from '../src/services/roteamentoReal.service.js';

const origem = { lat: -26.3045, lng: -48.8487 };
const pontosOrdenados = [{ id: 'p1', lat: -26.31, lng: -48.84, posicao: 1 }];

describe('roteamentoReal.service', () => {
  test('retorna null quando não há apiKey configurada', async () => {
    const fetchImpl = jest.fn();
    const resultado = await obterRotaReal({ origem, pontosOrdenados, apiKey: '', fetchImpl });

    expect(resultado).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('retorna null quando não há pontos pra rotear', async () => {
    const fetchImpl = jest.fn();
    const resultado = await obterRotaReal({ origem, pontosOrdenados: [], apiKey: 'fake', fetchImpl });

    expect(resultado).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('retorna null quando a resposta não é ok (ex.: limite de requisições atingido)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    const resultado = await obterRotaReal({ origem, pontosOrdenados, apiKey: 'fake', fetchImpl });

    expect(resultado).toBeNull();
  });

  test('retorna null quando o fetch lança (rede indisponível ou timeout)', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('network down'));
    const resultado = await obterRotaReal({ origem, pontosOrdenados, apiKey: 'fake', fetchImpl });

    expect(resultado).toBeNull();
  });

  test('retorna null quando a resposta não traz nenhuma feature de rota', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });
    const resultado = await obterRotaReal({ origem, pontosOrdenados, apiKey: 'fake', fetchImpl });

    expect(resultado).toBeNull();
  });

  test('converte a resposta GeoJSON da ORS em pontos [lat,lng] + distância/duração', async () => {
    const geojson = {
      features: [
        {
          geometry: {
            coordinates: [
              [-48.8487, -26.3045],
              [-48.84, -26.31],
            ],
          },
          properties: { summary: { distance: 4200, duration: 480 } },
        },
      ],
    };
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => geojson });

    const resultado = await obterRotaReal({ origem, pontosOrdenados, apiKey: 'fake', fetchImpl });

    expect(resultado).toEqual({
      pontos: [
        [-26.3045, -48.8487],
        [-26.31, -48.84],
      ],
      distanciaRealKm: 4.2,
      duracaoMinutos: 8,
    });
  });

  test('envia as coordenadas no formato [lng,lat] esperado pela ORS, origem primeiro', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { geometry: { coordinates: [] }, properties: { summary: { distance: 0, duration: 0 } } },
        ],
      }),
    });

    await obterRotaReal({ origem, pontosOrdenados, apiKey: 'chave-secreta', fetchImpl });

    const [url, opcoes] = fetchImpl.mock.calls[0];
    const corpo = JSON.parse(opcoes.body);

    expect(url).toContain('driving-car');
    expect(corpo.coordinates).toEqual([
      [origem.lng, origem.lat],
      [pontosOrdenados[0].lng, pontosOrdenados[0].lat],
    ]);
    expect(opcoes.headers.Authorization).toBe('chave-secreta');
  });
});
