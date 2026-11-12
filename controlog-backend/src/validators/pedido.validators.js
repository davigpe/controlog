import { z } from 'zod';

import { booleanoDeQuery } from './comum.validators.js';

export const gerarPedidosSchema = z.object({
  quantidade: z.coerce.number().int().min(1, 'Informe ao menos 1 pedido.').max(200, 'No máximo 200 pedidos por vez.'),
});

export const listPedidosQuerySchema = z.object({
  // Mesmo helper das outras listagens: o motivo de não usar z.coerce.boolean()
  // está documentado em comum.validators.js.
  disponivel: booleanoDeQuery.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
});
