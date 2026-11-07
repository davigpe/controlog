export type StatusVeiculo = 'DISPONIVEL' | 'MANUTENCAO' | 'INATIVO'

/** Espelha o enum VeiculoCategoria do backend (prisma/schema.prisma). */
export type CategoriaVeiculo =
  | 'MOTO'
  | 'PASSEIO'
  | 'UTILITARIO'
  | 'VAN'
  | 'VUC'
  | 'TRES_QUARTOS'
  | 'TOCO'
  | 'TRUCK'
  | 'CARRETA'
  | 'OUTRO'

export interface Veiculo {
  id: string
  placa: string
  modelo: string
  capacidade: string
  categoria: CategoriaVeiculo
  status: StatusVeiculo
  emRota: boolean
  criadoEm: string
}

export interface VeiculoInput {
  placa: string
  modelo: string
  capacidade: string
  categoria?: CategoriaVeiculo
  status?: StatusVeiculo
}
