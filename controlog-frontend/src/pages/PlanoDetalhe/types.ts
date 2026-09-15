import type { Pedido } from '@/pages/Pedidos/types';
import type { StatusPlano } from '@/pages/Planos/types';

export interface PlanoDetalhe {
  id: string;
  nome: string;
  status: StatusPlano;
  criadoEm: string;
  pedidos: Pedido[];
}
