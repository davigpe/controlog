import type { Pedido, ResultadoOtimizacao } from './types';

export type StatusRotaSimulada = 'rascunho' | 'calculando' | 'calculada' | 'erro';

export interface RotaSimulada {
  id: string;
  nome: string;
  cor: string;
  veiculo: string;
  pedidoIds: string[];
  /**
   * `unidades`/`volumeM3` de cada pedido nunca voltam em `resultado.ordem`
   * (o validator do backend não é `.passthrough()`, o Zod descarta esses
   * campos extras). Quem for somar esses agregados pra tabela precisa
   * procurar o pedido pelo id na lista mestre de `pedidos` da página, nunca
   * em `resultado.ordem`.
   */
  resultado: ResultadoOtimizacao | null;
  status: StatusRotaSimulada;
}

const PALETA_CORES = [
  '#2563eb', // azul
  '#dc2626', // vermelho
  '#16a34a', // verde
  '#9333ea', // roxo
  '#ea580c', // laranja
  '#0891b2', // ciano
  '#db2777', // rosa
  '#65a30d', // lima
  '#4338ca', // índigo
  '#b45309', // âmbar escuro
];

const TIPOS_VEICULO = ['Van', 'VUC', 'Fiorino', 'Caminhão 3/4'];

export function proximaCor(rotasExistentes: RotaSimulada[]): string {
  return PALETA_CORES[rotasExistentes.length % PALETA_CORES.length];
}

function proximoVeiculo(rotasExistentes: RotaSimulada[]): string {
  const numero = rotasExistentes.length + 1;
  const tipo = TIPOS_VEICULO[rotasExistentes.length % TIPOS_VEICULO.length];
  return `${tipo} ${String(numero).padStart(2, '0')}`;
}

function proximoNome(rotasExistentes: RotaSimulada[]): string {
  return `Rota ${rotasExistentes.length + 1}`;
}

/** Remove os pedidos informados de qualquer rota a que já pertençam. */
function removerDeTodas(rotas: RotaSimulada[], pedidoIds: string[]): RotaSimulada[] {
  const idsRemovidos = new Set(pedidoIds);
  return rotas.map((rota) => ({
    ...rota,
    pedidoIds: rota.pedidoIds.filter((id) => !idsRemovidos.has(id)),
  }));
}

// Cria uma rota nova com os pedidos informados — sempre tira esses pedidos
// de qualquer outra rota antes, pra manter a invariante 1 pedido = 1 rota.
export function criarRota(rotas: RotaSimulada[], pedidoIds: string[]): RotaSimulada[] {
  const semDuplicata = removerDeTodas(rotas, pedidoIds);
  const novaRota: RotaSimulada = {
    id: crypto.randomUUID(),
    nome: proximoNome(rotas),
    cor: proximaCor(rotas),
    veiculo: proximoVeiculo(rotas),
    pedidoIds: [...pedidoIds],
    resultado: null,
    status: 'rascunho',
  };
  return [...semDuplicata, novaRota];
}

// Atribui pedidos a uma rota existente — mesma invariante: tira de qualquer
// outra rota (incluindo a própria, pra não duplicar) antes de adicionar.
export function atribuirPedidos(
  rotas: RotaSimulada[],
  rotaId: string,
  pedidoIds: string[]
): RotaSimulada[] {
  const semDuplicata = removerDeTodas(rotas, pedidoIds);
  return semDuplicata.map((rota) =>
    rota.id === rotaId
      ? { ...rota, pedidoIds: [...rota.pedidoIds, ...pedidoIds], status: 'rascunho' as const }
      : rota
  );
}

// Sem `rotaIdAlvo`, remove os pedidos de qualquer rota a que pertençam.
// Com `rotaIdAlvo`, só remove os que pertencem a essa rota específica —
// usado pela ação "Desatribuir pedidos" disparada de uma linha da tabela.
export function desatribuirPedidos(
  rotas: RotaSimulada[],
  pedidoIds: string[],
  rotaIdAlvo?: string
): RotaSimulada[] {
  const idsRemovidos = new Set(pedidoIds);
  return rotas.map((rota) => {
    if (rotaIdAlvo && rota.id !== rotaIdAlvo) return rota;
    return { ...rota, pedidoIds: rota.pedidoIds.filter((id) => !idsRemovidos.has(id)) };
  });
}

export function excluirRota(rotas: RotaSimulada[], rotaId: string): RotaSimulada[] {
  return rotas.filter((rota) => rota.id !== rotaId);
}

export function renomearRota(rotas: RotaSimulada[], rotaId: string, novoNome: string): RotaSimulada[] {
  return rotas.map((rota) => (rota.id === rotaId ? { ...rota, nome: novoNome } : rota));
}

export function pedidosNaoAtribuidos(todosPedidos: Pedido[], rotas: RotaSimulada[]): Pedido[] {
  const atribuidos = new Set(rotas.flatMap((rota) => rota.pedidoIds));
  return todosPedidos.filter((pedido) => !atribuidos.has(pedido.id));
}

// Diff de pedidoIds por rota entre dois estados — usado pra saber quais
// rotas precisam ser recalculadas depois de qualquer transição (uma
// reatribuição pode afetar 2 rotas: a de origem e a de destino).
export function rotasAfetadas(antes: RotaSimulada[], depois: RotaSimulada[]): string[] {
  const antesPorId = new Map(antes.map((rota) => [rota.id, rota.pedidoIds.join(',')]));
  const afetadas: string[] = [];

  for (const rota of depois) {
    const assinaturaAntes = antesPorId.get(rota.id);
    const assinaturaDepois = rota.pedidoIds.join(',');
    if (assinaturaAntes !== assinaturaDepois) afetadas.push(rota.id);
  }

  return afetadas;
}
