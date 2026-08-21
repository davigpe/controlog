import { nearestNeighborTour, tourDistanceKm, twoOptImprove } from '../utils/geo.js';
import { obterRotaReal } from './roteamentoReal.service.js';

// Stateless (não usa Prisma, nada é persistido) — a fábrica recebe
// buscarRotaReal por injeção só pra permitir mockar a chamada à ORS nos
// testes, sem precisar de dependência nova de HTTP mocking.
export function createOtimizacaoRotaService({ buscarRotaReal = obterRotaReal } = {}) {
  return {
    async otimizar({ origem, pedidos }) {
      const ordemInicial = nearestNeighborTour(origem, pedidos);
      const ordemOtimizada = twoOptImprove(origem, ordemInicial);

      const distanciaOriginalKm = tourDistanceKm(origem, pedidos);
      const distanciaOtimizadaKm = tourDistanceKm(origem, ordemOtimizada);
      const economiaPercentual =
        distanciaOriginalKm > 0
          ? ((distanciaOriginalKm - distanciaOtimizadaKm) / distanciaOriginalKm) * 100
          : 0;

      const ordem = ordemOtimizada.map((pedido, indice) => ({ ...pedido, posicao: indice + 1 }));
      const rotaReal = await buscarRotaReal({ origem, pontosOrdenados: ordem });

      return {
        ordem,
        distanciaOtimizadaKm,
        distanciaOriginalKm,
        economiaPercentual,
        rotaReal,
      };
    },
  };
}

export const otimizacaoRotaService = createOtimizacaoRotaService();
