export type StatusRota = 'ativa' | 'concluida' | 'cancelada';

export interface Rota {
  id: string;
  codigo: string;
  origem: string;
  destino: string;
  motorista: string;
  veiculo: string;
  status: StatusRota;
  dataHora: string;
  coordenadasOrigem: [number, number];
  coordenadasDestino: [number, number];
}
