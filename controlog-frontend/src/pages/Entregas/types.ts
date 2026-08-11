export type StatusEntrega = 'PENDENTE' | 'EM_TRANSITO' | 'ENTREGUE' | 'CANCELADA'

export interface Entrega {
  id: string
  codigo: string
  destino: string
  status: StatusEntrega
  dataPrevista: string
  dataEfetiva?: string | null
  criadoEm: string
  rota: { id: string; codigo: string }
  motorista: { id: string; nome: string }
}

export interface EntregaInput {
  codigo: string
  rotaId: string
  motoristaId: string
  destino: string
  status?: StatusEntrega
  dataPrevista: string
  dataEfetiva?: string
}
