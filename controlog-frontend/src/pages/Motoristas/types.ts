export type StatusMotorista = 'Ativo' | 'Em Rota' | 'Inativo'

export interface Motorista {
  id: string
  nome: string
  cnh: string
  categoriaCnh: string
  telefone: string
  email: string
  status: StatusMotorista
  veiculo: string
  entregasRealizadas: number
  dataAdmissao: string
  observacoes?: string
}
