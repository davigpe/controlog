export type StatusRota = 'ATIVA' | 'CONCLUIDA' | 'CANCELADA';

export interface Rota {
  id: string;
  codigo: string;
  origem: string;
  destino: string;
  status: StatusRota;
  dataHora: string;
  criadoEm: string;
  coordenadasOrigem: [number, number];
  coordenadasDestino: [number, number];
  motorista: { id: string; nome: string };
  veiculo: { id: string; placa: string; modelo: string };
}

export interface RotaInput {
  codigo: string;
  origem: string;
  destino: string;
  motoristaId: string;
  veiculoId: string;
  dataHora: string;
  status?: StatusRota;
  latOrigem: number;
  lngOrigem: number;
  latDestino: number;
  lngDestino: number;
}
