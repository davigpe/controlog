import { z } from 'zod';

import { booleanoDeQuery } from './comum.validators.js';

const coordenada = z.number().min(-90).max(180);

export const createClienteSchema = z.object({
  // O código é o identificador de negócio: é por ele que um pedido vindo de
  // fora encontra o cadastro. Em maiúsculas sempre, para "cli-1" e "CLI-1" não
  // virarem dois clientes diferentes.
  codigo: z
    .string()
    .trim()
    .min(3, 'Código deve ter ao menos 3 caracteres.')
    .max(20, 'Código deve ter no máximo 20 caracteres.')
    .transform((v) => v.toUpperCase()),
  nome: z.string().trim().min(2, 'Informe o nome do cliente.'),
  endereco: z.string().trim().min(5, 'Informe o endereço com logradouro e número.'),
  bairro: z.string().trim().min(2, 'Informe o bairro.'),
  cidade: z.string().trim().min(2).default('Joinville'),
  uf: z.string().trim().length(2, 'UF deve ter 2 letras.').default('SC'),
  // Obrigatórias: um cliente sem coordenada não pode ser roteirizado, e aceitar
  // o cadastro sem elas só adiaria o erro para a hora de montar o plano.
  lat: coordenada,
  lng: coordenada,
  ativo: z.boolean().optional(),
});

export const updateClienteSchema = createClienteSchema.partial();

export const listClientesQuerySchema = z.object({
  busca: z.string().trim().optional(),
  ativo: booleanoDeQuery.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
