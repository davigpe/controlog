export type StatusRota = 'ATIVA' | 'CONCLUIDA' | 'CANCELADA'
export type StatusEntrega = 'PENDENTE' | 'EM_TRANSITO' | 'ENTREGUE' | 'NAO_ENTREGUE' | 'CANCELADA'

export type MotivoInsucesso =
  | 'CLIENTE_AUSENTE'
  | 'ENDERECO_NAO_ENCONTRADO'
  | 'RECUSADA_PELO_CLIENTE'
  | 'AVARIA'
  | 'OUTRO'

export interface EntregaDaRota {
  id: string
  codigo: string
  destino: string
  status: StatusEntrega
  dataPrevista: string
  dataEfetiva: string | null
  motivoInsucesso: MotivoInsucesso | null
  observacao: string | null
}

export interface MinhaRota {
  id: string
  codigo: string
  origem: string
  destino: string
  status: StatusRota
  dataHora: string
  coordenadasOrigem: [number, number]
  coordenadasDestino: [number, number]
  veiculo: { id: string; placa: string; modelo: string }
  entregas: EntregaDaRota[]
}

export interface MinhasRotasResposta {
  motorista: {
    id: string
    nome: string
    cnh: string
    telefone: string
    status: 'ATIVO' | 'INATIVO'
  }
  rotas: MinhaRota[]
}
