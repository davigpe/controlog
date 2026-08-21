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

export interface RotaReal {
  /** Pontos [lat, lng] do traçado real pelas ruas, na ordem em que a via percorre. */
  pontos: [number, number][];
  distanciaRealKm: number;
  duracaoMinutos: number;
}

export interface ResultadoOtimizacao {
  ordem: ParadaOtimizada[];
  distanciaOtimizadaKm: number;
  distanciaOriginalKm: number;
  economiaPercentual: number;
  /** null quando o traçado real não está disponível (sem chave da ORS, API fora do ar, etc.). */
  rotaReal: RotaReal | null;
}
