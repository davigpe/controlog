import { z } from 'zod';

// Teto de 500 nas listas de pedidos. Não é limite de produto — a geração
// aceita no máximo 200 por vez, então 500 está folgado para qualquer uso real.
// É contenção: coleção sem limite superior é a condição do GHSA-mrhx-c7xc-m3w5
// (zod exaure memória validando coleção grande com restrição de tamanho), e o
// limite de 1 MB do corpo deixaria passar cerca de 25 mil UUIDs.
const LIMITE_PEDIDOS_POR_REQUISICAO = 500;

const listaDePedidos = z
  .array(z.string().uuid('pedidoIds deve conter apenas ids válidos.'))
  .min(1, 'Selecione ao menos um pedido.')
  .max(LIMITE_PEDIDOS_POR_REQUISICAO, 'No máximo 500 pedidos por requisição.');

export const createPlanoSchema = z.object({
  nome: z.string().trim().min(1, 'Informe um nome para o plano.'),
  pedidoIds: listaDePedidos,
});

export const renomearPlanoSchema = z.object({
  nome: z.string().trim().min(1, 'Informe um nome para o plano.'),
});

export const otimizarPlanoSchema = z.object({
  tamanhoRota: z.coerce.number().int().min(1, 'Informe ao menos 1 pedido por rota.').max(50),
});

// rotaIndex null = desatribuir (o pedido fica no plano, mas fora de qualquer
// rota); um número = mandar pro grupo daquele índice, existente ou novo.
export const moverPedidosSchema = z.object({
  pedidoIds: listaDePedidos,
  rotaIndex: z.number().int().min(1, 'rotaIndex deve ser 1 ou maior.').nullable(),
});

// Motorista e veículo são opcionais: a rota pode ser aprovada antes de se
// saber quem dirige e em que veículo, e a atribuição acontece depois. `null`
// explícito e campo ausente significam a mesma coisa aqui — a tela manda null
// quando a pessoa escolhe "atribuir depois".
export const aprovarRotaSchema = z
  .object({
    motoristaId: z.string().uuid('Selecione um motorista válido.').nullish(),
    veiculoId: z.string().uuid('Selecione um veículo válido.').nullish(),
    veiculoProprio: z.boolean().optional().default(false),
    dataHora: z.coerce.date({ errorMap: () => ({ message: 'Data/hora inválida.' }) }),
  })
  .refine((d) => !(d.veiculoProprio && d.veiculoId), {
    message: 'Veículo próprio e veículo da frota são excludentes: escolha um dos dois.',
    path: ['veiculoId'],
  });

export const listPlanosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
