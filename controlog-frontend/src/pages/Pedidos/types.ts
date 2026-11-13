export interface Pedido {
  id: string;
  codigo: string;
  /**
   * Nome do cliente no momento do pedido — um instantâneo. Continua correto se
   * o cadastro for renomeado ou removido depois.
   */
  clienteNome: string;
  /** Vínculo com o cadastro. Null em pedidos criados antes de ele existir. */
  clienteId: string | null;
  endereco: string;
  cidade: string;
  lat: number;
  lng: number;
  unidades: number;
  volumeM3: number;
  criadoEm: string;
  planoId: string | null;
  rotaIndex: number | null;
}
