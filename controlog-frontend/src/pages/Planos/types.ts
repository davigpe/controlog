export type StatusPlano = 'ABERTO' | 'OTIMIZADO';

export interface PlanoResumo {
  id: string;
  nome: string;
  status: StatusPlano;
  criadoEm: string;
  totalPedidos: number;
}
