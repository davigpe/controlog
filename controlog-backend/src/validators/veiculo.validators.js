import { z } from 'zod';

// Mesma lista (e mesma ordem, do menor porte ao maior) do enum
// VeiculoCategoria no schema.prisma. Fica exportada porque o filtro da
// listagem e os dois schemas de escrita precisam dela.
export const CATEGORIAS_VEICULO = [
  'MOTO',
  'PASSEIO',
  'UTILITARIO',
  'VAN',
  'VUC',
  'TRES_QUARTOS',
  'TOCO',
  'TRUCK',
  'CARRETA',
  'OUTRO',
];

export const createVeiculoSchema = z.object({
  placa: z.string().trim().min(6, 'Placa inválida.'),
  modelo: z.string().trim().min(2, 'Modelo deve ter ao menos 2 caracteres.'),
  capacidade: z.string().trim().min(1, 'Capacidade é obrigatória.'),
  // Opcional: o banco cai em OUTRO quando não vem, igual às linhas antigas.
  categoria: z.enum(CATEGORIAS_VEICULO).optional(),
  status: z.enum(['DISPONIVEL', 'MANUTENCAO', 'INATIVO']).optional(),
});

export const updateVeiculoSchema = createVeiculoSchema.partial();

export const listVeiculosQuerySchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(['DISPONIVEL', 'MANUTENCAO', 'INATIVO']).optional(),
  categoria: z.enum(CATEGORIAS_VEICULO).optional(),
  emRota: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
