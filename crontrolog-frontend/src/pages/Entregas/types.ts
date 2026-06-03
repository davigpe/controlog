export type StatusEntrega = 'Concluída' | 'Em Rota' | 'Pendente' | 'Cancelada'

export interface Entrega {
  id: string
  cliente: string
  destino: string
  endereco: string
  motorista: string
  veiculo: string
  status: StatusEntrega
  dataPrevista: string
  dataConclusao?: string
  peso: string
  observacoes?: string
}
