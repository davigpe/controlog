import { z } from 'zod';

export const createMotoristaSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  cnh: z.string().trim().min(5, 'CNH inválida.'),
  telefone: z.string().trim().min(8, 'Telefone inválido.'),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
});

export const updateMotoristaSchema = createMotoristaSchema.partial();

export const listMotoristasQuerySchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
});
