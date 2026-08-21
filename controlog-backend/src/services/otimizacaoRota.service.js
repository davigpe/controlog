import { nearestNeighborTour, tourDistanceKm, twoOptImprove } from '../utils/geo.js';

// Serviço stateless (não usa Prisma, nada é persistido) — por isso é um objeto
// simples, sem a fábrica create*Service(prisma) usada nos demais serviços.
export const otimizacaoRotaService = {
  otimizar({ origem, pedidos }) {
    const ordemInicial = nearestNeighborTour(origem, pedidos);
    const ordemOtimizada = twoOptImprove(origem, ordemInicial);

    const distanciaOriginalKm = tourDistanceKm(origem, pedidos);
    const distanciaOtimizadaKm = tourDistanceKm(origem, ordemOtimizada);
    const economiaPercentual =
      distanciaOriginalKm > 0
        ? ((distanciaOriginalKm - distanciaOtimizadaKm) / distanciaOriginalKm) * 100
        : 0;

    return {
      ordem: ordemOtimizada.map((pedido, indice) => ({ ...pedido, posicao: indice + 1 })),
      distanciaOtimizadaKm,
      distanciaOriginalKm,
      economiaPercentual,
    };
  },
};
