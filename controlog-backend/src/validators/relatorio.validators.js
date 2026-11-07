import { z } from 'zod';

export const relatorioQuerySchema = z
  .object({
    dataInicio: z.coerce.date().optional(),
    dataFim: z.coerce.date().optional(),
  })
  .refine((data) => !data.dataInicio || !data.dataFim || data.dataInicio <= data.dataFim, {
    message: 'dataInicio deve ser anterior ou igual a dataFim.',
    path: ['dataInicio'],
  });

// ─── Rotas do dia ─────────────────────────────────────────────────────────
// "Carregadas no dia" tem duas leituras legítimas: o horário operacional da
// rota (quando o veículo carrega e sai) e o momento em que ela foi cadastrada
// no sistema. Em vez de escolher uma e deixar a outra inacessível, a base de
// contagem é um parâmetro — a tela oferece as duas.
export const BASES_ROTAS_DO_DIA = ['dataHora', 'criadoEm'];

export const rotasDoDiaQuerySchema = z.object({
  // Data civil (AAAA-MM-DD), não timestamp: o recorte é "o dia", e o fuso de
  // operação é aplicado no service. Sem data, vale hoje.
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD.')
    .optional(),
  base: z.enum(BASES_ROTAS_DO_DIA).default('dataHora'),
});
