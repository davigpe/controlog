export interface Cliente {
  id: string
  /** Identificador de negócio (CLI-001) — é por ele que um pedido externo se vincula. */
  codigo: string
  nome: string
  endereco: string
  bairro: string
  cidade: string
  uf: string
  /** [lat, lng] — geocodificado uma vez, no cadastro. */
  coordenadas: [number, number]
  ativo: boolean
  criadoEm: string
  /** Quantos pedidos já foram feitos para este cliente. */
  totalPedidos: number
}

export interface ClienteInput {
  codigo: string
  nome: string
  endereco: string
  bairro: string
  cidade?: string
  uf?: string
  lat: number
  lng: number
  ativo?: boolean
}
