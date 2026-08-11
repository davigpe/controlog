import type { Motorista } from './types'

export function statusExibicao(motorista: Motorista): 'Ativo' | 'Em Rota' | 'Inativo' {
  if (motorista.status === 'INATIVO') return 'Inativo'
  return motorista.emRota ? 'Em Rota' : 'Ativo'
}
