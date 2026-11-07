export type StatusEntrega =
  | 'PENDENTE'
  | 'EM_TRANSITO'
  | 'ENTREGUE'
  | 'NAO_ENTREGUE'
  | 'CANCELADA'

export type MotivoInsucesso =
  | 'CLIENTE_AUSENTE'
  | 'ENDERECO_NAO_ENCONTRADO'
  | 'RECUSADA_PELO_CLIENTE'
  | 'AVARIA'
  | 'OUTRO'

export interface Entrega {
  id: string
  codigo: string
  destino: string
  status: StatusEntrega
  dataPrevista: string
  dataEfetiva?: string | null
  motivoInsucesso?: MotivoInsucesso | null
  observacao?: string | null
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
