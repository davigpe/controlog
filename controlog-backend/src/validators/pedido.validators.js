import { z } from 'zod';

export const gerarPedidosSchema = z.object({
  quantidade: z.coerce.number().int().min(1, 'Informe ao menos 1 pedido.').max(200, 'No máximo 200 pedidos por vez.'),
});

// z.coerce.boolean() coerciona qualquer string não-vazia (inclusive "false")
// pra true — por isso o preprocess explícito abaixo em vez disso.
export const listPedidosQuerySchema = z.object({
  disponivel: z
    .preprocess((v) => (typeof v === 'string' ? v === 'true' : v), z.boolean())
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
});
