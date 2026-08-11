import { z } from 'zod';

const coordenada = z.number().min(-90).max(180);

// RN06 — Toda rota deve ter obrigatoriamente origem, destino, motorista e veículo
export const createRotaSchema = z.object({
  codigo: z.string().trim().min(3, 'Código deve ter ao menos 3 caracteres.'),
  origem: z.string().trim().min(2, 'Origem é obrigatória.'),
  destino: z.string().trim().min(2, 'Destino é obrigatório.'),
  motoristaId: z.string().uuid('motoristaId inválido.'),
  veiculoId: z.string().uuid('veiculoId inválido.'),
  dataHora: z.coerce.date({ errorMap: () => ({ message: 'Data/hora inválida.' }) }),
  status: z.enum(['ATIVA', 'CONCLUIDA', 'CANCELADA']).optional(),
  latOrigem: coordenada,
  lngOrigem: coordenada,
  latDestino: coordenada,
  lngDestino: coordenada,
});

export const updateRotaSchema = createRotaSchema.partial();

export const listRotasQuerySchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(['ATIVA', 'CONCLUIDA', 'CANCELADA']).optional(),
});
