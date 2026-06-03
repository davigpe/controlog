export type StatusVeiculo = 'Disponível' | 'Em Rota' | 'Manutenção' | 'Inativo'

export interface Veiculo {
  id: string
  placa: string
  modelo: string
  marca: string
  ano: string
  tipo: string
  capacidade: string
  status: StatusVeiculo
  motorista: string
  kmAtual: string
  ultimaRevisao: string
  proximaRevisao: string
  observacoes?: string
}
