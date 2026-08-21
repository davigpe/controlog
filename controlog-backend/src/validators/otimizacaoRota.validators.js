import { z } from 'zod';

const ponto = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const otimizarRotaSchema = z.object({
  origem: ponto,
  pedidos: z
    .array(
      ponto.extend({
        id: z.string().trim().min(1, 'id do pedido é obrigatório.'),
        endereco: z.string().trim().optional(),
      })
    )
    .min(1, 'Informe ao menos um pedido.')
    .max(50, 'No máximo 50 pedidos por otimização.'),
});
