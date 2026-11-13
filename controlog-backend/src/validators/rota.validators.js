import { z } from 'zod';

const coordenada = z.number().min(-90).max(180);

// RN06 (revisada) — Toda rota exige origem, destino e data/hora. Motorista e
// veículo passaram a ser opcionais: a operação aprova a rota primeiro e define
// quem dirige depois, na tela de Atribuição. A versão anterior da regra os
// exigia, o que obrigava a escolher um motorista provisório só para destravar
// a aprovação — sem nenhum registro de que a escolha era provisória.
export const createRotaSchema = z
  .object({
    codigo: z.string().trim().min(3, 'Código deve ter ao menos 3 caracteres.'),
    origem: z.string().trim().min(2, 'Origem é obrigatória.'),
    destino: z.string().trim().min(2, 'Destino é obrigatório.'),
    motoristaId: z.string().uuid('motoristaId inválido.').nullish(),
    veiculoId: z.string().uuid('veiculoId inválido.').nullish(),
    veiculoProprio: z.boolean().optional().default(false),
    dataHora: z.coerce.date({ errorMap: () => ({ message: 'Data/hora inválida.' }) }),
    status: z.enum(['ATIVA', 'CONCLUIDA', 'CANCELADA']).optional(),
    latOrigem: coordenada,
    lngOrigem: coordenada,
    latDestino: coordenada,
    lngDestino: coordenada,
  })
  .refine((d) => !(d.veiculoProprio && d.veiculoId), {
    message: 'Veículo próprio e veículo da frota são excludentes: escolha um dos dois.',
    path: ['veiculoId'],
  });

// .partial() não existe em ZodEffects (o schema acima tem .refine), então o de
// atualização é montado do objeto cru e ganha a mesma checagem.
export const updateRotaSchema = createRotaSchema.innerType()
  .partial()
  .refine((d) => !(d.veiculoProprio && d.veiculoId), {
    message: 'Veículo próprio e veículo da frota são excludentes: escolha um dos dois.',
    path: ['veiculoId'],
  });

export const listRotasQuerySchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(['ATIVA', 'CONCLUIDA', 'CANCELADA']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
