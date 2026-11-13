import { z } from 'zod';

// RN07 — Toda entrega deve estar obrigatoriamente vinculada a uma rota e a um motorista
export const createEntregaSchema = z.object({
  codigo: z.string().trim().min(3, 'Código deve ter ao menos 3 caracteres.'),
  rotaId: z.string().uuid('rotaId inválido.'),
  // Opcional: a entrega acompanha a rota, e uma rota sem motorista gera
  // entregas sem dono até a atribuição acontecer.
  motoristaId: z.string().uuid('motoristaId inválido.').nullish(),
  destino: z.string().trim().min(2, 'Destino é obrigatório.'),
  status: z.enum(['PENDENTE', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA']).optional(),
  dataPrevista: z.coerce.date({ errorMap: () => ({ message: 'Data prevista inválida.' }) }),
  dataEfetiva: z.coerce.date().optional(),
});

export const updateEntregaSchema = createEntregaSchema.partial();

export const listEntregasQuerySchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(['PENDENTE', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA']).optional(),
  rotaId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
