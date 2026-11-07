import type { StatusRota } from '@/pages/Rotas/types'

/**
 * Qual data conta como "o dia" da rota. `dataHora` é o horário operacional
 * (quando o veículo carrega e sai); `criadoEm` é o momento em que a rota foi
 * cadastrada no sistema. As duas leituras existem no uso real, então a tela
 * deixa escolher em vez de arbitrar uma.
 */
export type BaseDoDia = 'dataHora' | 'criadoEm'

export interface RotaDoDia {
  id: string
  codigo: string
  origem: string
  destino: string
  status: StatusRota
  dataHora: string
  criadoEm: string
  motorista: { id: string; nome: string }
  veiculo: { id: string; placa: string; modelo: string }
  totalEntregas: number
  entregasConcluidas: number
}

export interface RotasDoDiaResponse {
  /** O dia consultado, em AAAA-MM-DD. */
  data: string
  base: BaseDoDia
  totalRotas: number
  totalEntregas: number
  entregasConcluidas: number
  rotas: RotaDoDia[]
}
