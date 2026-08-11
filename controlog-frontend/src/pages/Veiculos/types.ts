export type StatusVeiculo = 'DISPONIVEL' | 'MANUTENCAO' | 'INATIVO'

export interface Veiculo {
  id: string
  placa: string
  modelo: string
  capacidade: string
  status: StatusVeiculo
  emRota: boolean
  criadoEm: string
}

export interface VeiculoInput {
  placa: string
  modelo: string
  capacidade: string
  status?: StatusVeiculo
}
