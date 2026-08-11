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
