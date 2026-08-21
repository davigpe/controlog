const EARTH_RADIUS_KM = 6371;
const MAX_ITERACOES_PADRAO = 500;

function toRad(graus) {
  return (graus * Math.PI) / 180;
}

// Distância em linha reta entre dois pontos (lat/lng), pela fórmula de haversine.
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Soma a distância de um trajeto de ida (sem voltar ao ponto de origem).
export function tourDistanceKm(origem, pontosOrdenados) {
  let total = 0;
  let atual = origem;
  for (const ponto of pontosOrdenados) {
    total += haversineKm(atual, ponto);
    atual = ponto;
  }
  return total;
}

// Constrói uma ordem inicial de visita: a cada passo, vai para o ponto não
// visitado mais próximo da posição atual.
export function nearestNeighborTour(origem, pontos) {
  const restantes = [...pontos];
  const ordem = [];
  let atual = origem;

  while (restantes.length > 0) {
    let indiceMaisProximo = 0;
    let menorDistancia = haversineKm(atual, restantes[0]);
    for (let i = 1; i < restantes.length; i++) {
      const distancia = haversineKm(atual, restantes[i]);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        indiceMaisProximo = i;
      }
    }
    const [proximo] = restantes.splice(indiceMaisProximo, 1);
    ordem.push(proximo);
    atual = proximo;
  }

  return ordem;
}

// Melhoria local 2-opt sobre um trajeto de ida: tenta inverter cada segmento
// [i, j] e mantém a troca só quando reduz a distância total. Convergência
// garantida (só aceita trocas melhores), com um teto de iterações por segurança.
export function twoOptImprove(origem, ordemInicial, { maxIteracoes = MAX_ITERACOES_PADRAO } = {}) {
  let ordem = [...ordemInicial];
  let melhorou = ordem.length > 1;
  let iteracoes = 0;

  while (melhorou && iteracoes < maxIteracoes) {
    melhorou = false;
    iteracoes++;

    for (let i = 0; i < ordem.length - 1; i++) {
      for (let j = i + 1; j < ordem.length; j++) {
        const antesI = i === 0 ? origem : ordem[i - 1];
        const depoisJ = j === ordem.length - 1 ? null : ordem[j + 1];

        const distanciaAtual =
          haversineKm(antesI, ordem[i]) + (depoisJ ? haversineKm(ordem[j], depoisJ) : 0);
        const distanciaTrocada =
          haversineKm(antesI, ordem[j]) + (depoisJ ? haversineKm(ordem[i], depoisJ) : 0);

        if (distanciaTrocada < distanciaAtual - 1e-9) {
          const segmento = ordem.slice(i, j + 1).reverse();
          ordem = [...ordem.slice(0, i), ...segmento, ...ordem.slice(j + 1)];
          melhorou = true;
        }
      }
    }
  }

  return ordem;
}
