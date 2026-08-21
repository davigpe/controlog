export interface Coordenada {
  lat: number;
  lng: number;
}

export interface Pedido extends Coordenada {
  id: string;
  endereco: string;
}

export interface ParadaOtimizada extends Pedido {
  posicao: number;
}

export interface ResultadoOtimizacao {
  ordem: ParadaOtimizada[];
  distanciaOtimizadaKm: number;
  distanciaOriginalKm: number;
  economiaPercentual: number;
}
