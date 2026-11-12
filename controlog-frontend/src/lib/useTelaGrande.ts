import { useSyncExternalStore } from 'react';

/** Mesmo ponto de corte do `lg:` do Tailwind. */
export const LARGURA_TELA_GRANDE = 1024;
const CONSULTA = `(min-width: ${LARGURA_TELA_GRANDE}px)`;

function temMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function assinar(aoMudar: () => void): () => void {
  if (!temMatchMedia()) return () => {};
  const mql = window.matchMedia(CONSULTA);
  mql.addEventListener('change', aoMudar);
  return () => mql.removeEventListener('change', aoMudar);
}

function ler(): boolean {
  // Sem matchMedia (ambiente sem DOM), assume desktop: é o layout que já
  // existia antes da gaveta, então é o padrão menos surpreendente.
  if (!temMatchMedia()) return true;
  return window.matchMedia(CONSULTA).matches;
}

/**
 * Diz se a tela é larga o bastante para a sidebar caber ao lado do conteúdo.
 *
 * Existe porque "sidebar recolhida" é uma preferência que só faz sentido no
 * desktop: no celular a sidebar é uma gaveta sobreposta, e aplicar o modo
 * recolhido ali deixaria o motorista com uma gaveta de ícones sem rótulo —
 * inutilizável, e por uma preferência que ele marcou noutro aparelho.
 *
 * Resolver isso só com classes `lg:` exigiria renderizar as duas versões e
 * esconder uma, o que duplica o conteúdo no DOM: leitores de tela leriam as
 * duas, e as consultas por texto passariam a encontrar dois resultados.
 *
 * useSyncExternalStore, e não useState mais useEffect: matchMedia é estado
 * externo ao React, e a versão com efeito precisava de um setState síncrono
 * na montagem para não perder uma mudança ocorrida entre o primeiro render e
 * o efeito — o que dispara renderização em cascata.
 */
export function useTelaGrande(): boolean {
  return useSyncExternalStore(assinar, ler, () => true);
}
