import type { Pedido } from '@/pages/Pedidos/types';
import type { StatusPlano } from '@/pages/Planos/types';

export interface PedidoDoPlano extends Pedido {
  /** Preenchido quando a rota (grupo) desse pedido já foi aprovada. */
  rota: { codigo: string } | null;
}

export interface PlanoDetalhe {
  id: string;
  nome: string;
  status: StatusPlano;
  criadoEm: string;
  pedidos: PedidoDoPlano[];
}
