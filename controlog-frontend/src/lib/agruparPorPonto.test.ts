import { describe, expect, test } from 'vitest';
import { agruparPorPonto, chaveDoPonto } from './agruparPorPonto';

const PALMEIRAS = { lat: -26.303486, lng: -48.844667 };
const NOVEMBRO = { lat: -26.300811, lng: -48.843885 };

describe('chaveDoPonto', () => {
  test('a mesma coordenada gera a mesma chave', () => {
    expect(chaveDoPonto(PALMEIRAS.lat, PALMEIRAS.lng)).toBe(
      chaveDoPonto(PALMEIRAS.lat, PALMEIRAS.lng)
    );
  });

  // Um valor vindo de outra origem pode diferir na última casa; dois pinos
  // sobrepostos a 1 cm de distância deveriam ser um.
  test('diferença abaixo de ~11 cm cai na mesma chave', () => {
    expect(chaveDoPonto(-26.3034861, -48.8446671)).toBe(chaveDoPonto(-26.3034859, -48.8446669));
  });

  test('endereços diferentes geram chaves diferentes', () => {
    expect(chaveDoPonto(PALMEIRAS.lat, PALMEIRAS.lng)).not.toBe(
      chaveDoPonto(NOVEMBRO.lat, NOVEMBRO.lng)
    );
  });
});

describe('agruparPorPonto', () => {
  test('lista vazia devolve nada', () => {
    expect(agruparPorPonto([])).toEqual([]);
  });

  // O caso que motivou isto: o mesmo cliente comprou quatro vezes, e sem
  // agrupar o Leaflet empilha os marcadores — a tela mostra um pino só.
  test('junta pedidos no mesmo endereço num ponto só', () => {
    const pedidos = [
      { id: 'a', ...PALMEIRAS },
      { id: 'b', ...PALMEIRAS },
      { id: 'c', ...NOVEMBRO },
      { id: 'd', ...PALMEIRAS },
    ];

    const pontos = agruparPorPonto(pedidos);

    expect(pontos).toHaveLength(2);
    const palmeiras = pontos.find((p) => p.itens.length === 3);
    expect(palmeiras?.itens.map((i) => i.id)).toEqual(['a', 'b', 'd']);
  });

  test('preserva a ordem de chegada dentro do ponto', () => {
    const pontos = agruparPorPonto([
      { id: 'primeiro', ...PALMEIRAS },
      { id: 'segundo', ...PALMEIRAS },
    ]);
    expect(pontos[0].itens.map((i) => i.id)).toEqual(['primeiro', 'segundo']);
  });

  // O arredondamento serve para agrupar, não para mover o pino: o marcador
  // precisa continuar em cima do endereço.
  test('o ponto mantém a coordenada original, não a arredondada', () => {
    const pontos = agruparPorPonto([{ id: 'a', lat: -26.3034861234, lng: -48.8446671234 }]);
    expect(pontos[0].lat).toBe(-26.3034861234);
    expect(pontos[0].lng).toBe(-48.8446671234);
  });

  test('cada endereço distinto vira um ponto', () => {
    const pontos = agruparPorPonto([
      { id: 'a', ...PALMEIRAS },
      { id: 'b', ...NOVEMBRO },
      { id: 'c', lat: -26.29, lng: -48.85 },
    ]);
    expect(pontos).toHaveLength(3);
    expect(pontos.every((p) => p.itens.length === 1)).toBe(true);
  });
});
