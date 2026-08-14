import { z } from 'zod';

export const createVeiculoSchema = z.object({
  placa: z.string().trim().min(6, 'Placa inválida.'),
  modelo: z.string().trim().min(2, 'Modelo deve ter ao menos 2 caracteres.'),
  capacidade: z.string().trim().min(1, 'Capacidade é obrigatória.'),
  status: z.enum(['DISPONIVEL', 'MANUTENCAO', 'INATIVO']).optional(),
});

export const updateVeiculoSchema = createVeiculoSchema.partial();

export const listVeiculosQuerySchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(['DISPONIVEL', 'MANUTENCAO', 'INATIVO']).optional(),
  emRota: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
