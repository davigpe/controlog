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
  /** null quando a rota foi aprovada antes de se definir quem dirige. */
  motorista: { id: string; nome: string } | null;
  /** null tanto para "a definir" quanto para veículo próprio — ver veiculoProprio. */
  veiculo: { id: string; placa: string; modelo: string } | null;
  /** O motorista usa veículo que não é da frota. */
  veiculoProprio: boolean;
  totalEntregas: number;
  entregasPendentes: number;
}

export interface RotaInput {
  codigo: string;
  origem: string;
  destino: string;
  motoristaId: string | null;
  veiculoId: string | null;
  veiculoProprio?: boolean;
  dataHora: string;
  status?: StatusRota;
  latOrigem: number;
  lngOrigem: number;
  latDestino: number;
  lngDestino: number;
}
