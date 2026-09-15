export interface Pedido {
  id: string;
  codigo: string;
  cliente: string;
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
