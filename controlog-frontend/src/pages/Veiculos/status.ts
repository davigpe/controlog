import type { Veiculo } from './types'

export function statusExibicao(veiculo: Veiculo): 'Disponível' | 'Em Rota' | 'Manutenção' | 'Inativo' {
  if (veiculo.status === 'MANUTENCAO') return 'Manutenção'
  if (veiculo.status === 'INATIVO') return 'Inativo'
  return veiculo.emRota ? 'Em Rota' : 'Disponível'
}
