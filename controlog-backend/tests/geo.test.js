import { haversineKm, nearestNeighborTour, tourDistanceKm, twoOptImprove } from '../src/utils/geo.js';

describe('geo', () => {
  describe('haversineKm', () => {
    test('distância entre um ponto e ele mesmo é zero', () => {
      const ponto = { lat: -26.3045, lng: -48.8487 };
      expect(haversineKm(ponto, ponto)).toBeCloseTo(0, 6);
    });

    test('1 grau de latitude equivale a aproximadamente 111,2 km', () => {
      const a = { lat: 0, lng: 0 };
      const b = { lat: 1, lng: 0 };
      expect(haversineKm(a, b)).toBeCloseTo(111.19, 1);
    });

    test('é simétrica', () => {
      const a = { lat: -26.3045, lng: -48.8487 };
      const b = { lat: -27.5954, lng: -48.548 };
      expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
    });
  });

  describe('tourDistanceKm', () => {
    test('soma a distância origem → p0 → p1 → ... sem voltar ao início', () => {
      const origem = { lat: 0, lng: 0 };
      const p1 = { lat: 0, lng: 1 };
      const p2 = { lat: 0, lng: 3 };

      const esperado = haversineKm(origem, p1) + haversineKm(p1, p2);
      expect(tourDistanceKm(origem, [p1, p2])).toBeCloseTo(esperado, 9);
    });

    test('retorna 0 para uma lista de pontos vazia', () => {
      expect(tourDistanceKm({ lat: 0, lng: 0 }, [])).toBe(0);
    });
  });

  describe('nearestNeighborTour', () => {
    test('visita cada ponto exatamente uma vez', () => {
      const origem = { lat: -26.3045, lng: -48.8487 };
      const pontos = [
        { id: 'p1', lat: -26.31, lng: -48.84 },
        { id: 'p2', lat: -26.29, lng: -48.86 },
        { id: 'p3', lat: -26.32, lng: -48.9 },
        { id: 'p4', lat: -26.28, lng: -48.83 },
        { id: 'p5', lat: -26.35, lng: -48.88 },
      ];

      const ordem = nearestNeighborTour(origem, pontos);

      expect(ordem).toHaveLength(pontos.length);
      expect(new Set(ordem.map((p) => p.id))).toEqual(new Set(pontos.map((p) => p.id)));
    });
  });

  describe('twoOptImprove', () => {
    test('nunca resulta numa distância pior que a ordem recebida', () => {
      const origem = { lat: -26.3045, lng: -48.8487 };
      const pontos = [
        { id: 'p1', lat: -26.31, lng: -48.84 },
        { id: 'p2', lat: -26.29, lng: -48.86 },
        { id: 'p3', lat: -26.32, lng: -48.9 },
        { id: 'p4', lat: -26.28, lng: -48.83 },
        { id: 'p5', lat: -26.35, lng: -48.88 },
      ];

      const ordemInicial = nearestNeighborTour(origem, pontos);
      const ordemOtimizada = twoOptImprove(origem, ordemInicial);

      expect(tourDistanceKm(origem, ordemOtimizada)).toBeLessThanOrEqual(
        tourDistanceKm(origem, ordemInicial) + 1e-9
      );
    });

    test('corrige uma ordem claramente ruim (zigue-zague) para a ordem ótima', () => {
      const origem = { lat: 0, lng: 0 };
      const a = { id: 'a', lat: 0, lng: 1 };
      const b = { id: 'b', lat: 0, lng: 2 };
      const c = { id: 'c', lat: 0, lng: 3 };
      const ordemRuim = [c, a, b];

      const ordemMelhorada = twoOptImprove(origem, ordemRuim);

      expect(tourDistanceKm(origem, ordemMelhorada)).toBeLessThan(tourDistanceKm(origem, ordemRuim));
      expect(ordemMelhorada.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    });

    test('não quebra com um único ponto', () => {
      const origem = { lat: 0, lng: 0 };
      const a = { id: 'a', lat: 1, lng: 1 };
      expect(twoOptImprove(origem, [a])).toEqual([a]);
    });
  });
});
