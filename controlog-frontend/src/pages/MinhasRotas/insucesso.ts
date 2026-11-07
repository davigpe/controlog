import type { MotivoInsucesso } from './types'

/**
 * Motivos de insucesso, na mesma ordem do enum do backend. Ficam fora dos
 * componentes porque a página e o modal usam os dois, e um arquivo .tsx só
 * pode exportar componentes (regra do react-refresh).
 */
export const MOTIVOS_INSUCESSO: MotivoInsucesso[] = [
  'CLIENTE_AUSENTE',
  'ENDERECO_NAO_ENCONTRADO',
  'RECUSADA_PELO_CLIENTE',
  'AVARIA',
  'OUTRO',
]

export const MOTIVO_INSUCESSO_LABEL: Record<MotivoInsucesso, string> = {
  CLIENTE_AUSENTE: 'Cliente ausente',
  ENDERECO_NAO_ENCONTRADO: 'Endereço não encontrado',
  RECUSADA_PELO_CLIENTE: 'Recusada pelo cliente',
  AVARIA: 'Avaria na mercadoria',
  OUTRO: 'Outro',
}
