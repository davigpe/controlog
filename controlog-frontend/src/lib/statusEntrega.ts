import type { StatusEntrega } from '@/pages/Entregas/types';

/**
 * Como cada status de entrega aparece para o usuário.
 *
 * Fica num lugar só porque já se espalhou e deu errado: o rótulo estava
 * duplicado em quatro telas, e quando `NAO_ENTREGUE` foi criado (registro de
 * insucesso) o mapa do Dashboard ficou para trás. O gráfico passou a mostrar
 * `NAO_ENTREGUE` cru em vez de "Não entregue" — e o defeito sobreviveu a várias
 * versões porque o fallback `?? status` não quebra nada, só exibe o enum.
 *
 * `Record<StatusEntrega, string>` em vez de `Record<string, string>` de
 * propósito: com o tipo fechado, acrescentar um status ao enum passa a ser um
 * erro de compilação aqui, em vez de um rótulo faltando em produção.
 */
export const STATUS_ENTREGA_LABEL: Record<StatusEntrega, string> = {
  PENDENTE: 'Pendente',
  EM_TRANSITO: 'Em trânsito',
  ENTREGUE: 'Entregue',
  NAO_ENTREGUE: 'Não entregue',
  CANCELADA: 'Cancelada',
};

/**
 * Cores das fatias do gráfico do Dashboard.
 *
 * `NAO_ENTREGUE` usa laranja, e não o âmbar dos distintivos das listas: no
 * gráfico ele fica ao lado do amarelo de `EM_TRANSITO`, e âmbar com amarelo
 * numa pizza é indistinguível.
 */
export const STATUS_ENTREGA_COR: Record<StatusEntrega, string> = {
  PENDENTE: '#ef4444',
  EM_TRANSITO: '#eab308',
  ENTREGUE: '#22c55e',
  NAO_ENTREGUE: '#ea580c',
  CANCELADA: '#9ca3af',
};

/** Rótulo de um status que veio da API como texto livre. */
export function rotuloDoStatus(status: string): string {
  return STATUS_ENTREGA_LABEL[status as StatusEntrega] ?? status;
}

export function corDoStatus(status: string): string {
  return STATUS_ENTREGA_COR[status as StatusEntrega] ?? '#94a3b8';
}

/**
 * Mesma coisa no plural, para legendas que contam ocorrências ("12 Entregues").
 *
 * Existe porque a tela de Relatórios tinha a própria cópia — e ela também
 * ficou sem `NAO_ENTREGUE`, exibindo o enum cru no gráfico pelo mesmo motivo
 * que o Dashboard.
 */
export const STATUS_ENTREGA_LABEL_PLURAL: Record<StatusEntrega, string> = {
  PENDENTE: 'Pendentes',
  // Sem plural natural: "Em trânsitos" não existe.
  EM_TRANSITO: 'Em trânsito',
  ENTREGUE: 'Entregues',
  NAO_ENTREGUE: 'Não entregues',
  CANCELADA: 'Canceladas',
};

export function rotuloPluralDoStatus(status: string): string {
  return STATUS_ENTREGA_LABEL_PLURAL[status as StatusEntrega] ?? status;
}
