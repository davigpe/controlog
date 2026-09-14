import { z } from 'zod';

export const createPlanoSchema = z.object({
  nome: z.string().trim().min(1, 'Informe um nome para o plano.'),
  pedidoIds: z
    .array(z.string().uuid('pedidoIds deve conter apenas ids válidos.'))
    .min(1, 'Selecione ao menos um pedido.'),
});

export const renomearPlanoSchema = z.object({
  nome: z.string().trim().min(1, 'Informe um nome para o plano.'),
});

export const otimizarPlanoSchema = z.object({
  tamanhoRota: z.coerce.number().int().min(1, 'Informe ao menos 1 pedido por rota.').max(50),
});

export const listPlanosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
