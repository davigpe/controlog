export type StatusMotorista = 'ATIVO' | 'INATIVO'

export interface Motorista {
  id: string
  nome: string
  cnh: string
  telefone: string
  status: StatusMotorista
  emRota: boolean
  entregasRealizadas: number
  criadoEm: string
}

export interface MotoristaInput {
  nome: string
  cnh: string
  telefone: string
  status?: StatusMotorista
}
