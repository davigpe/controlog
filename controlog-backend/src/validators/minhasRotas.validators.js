import { z } from 'zod';

export const listMinhasRotasQuerySchema = z.object({
  status: z.enum(['ATIVA', 'CONCLUIDA', 'CANCELADA']).optional(),
});

export const MOTIVOS_INSUCESSO = [
  'CLIENTE_AUSENTE',
  'ENDERECO_NAO_ENCONTRADO',
  'RECUSADA_PELO_CLIENTE',
  'AVARIA',
  'OUTRO',
];

export const registrarInsucessoSchema = z.object({
  motivo: z.enum(MOTIVOS_INSUCESSO, {
    message: 'Informe um motivo de insucesso válido.',
  }),
  // Opcional em geral, mas obrigatória em OUTRO: "outro" sem explicação não
  // diz nada a quem for tratar a entrega depois.
  observacao: z.string().trim().max(500, 'A observação deve ter no máximo 500 caracteres.').optional(),
}).refine((dados) => dados.motivo !== 'OUTRO' || Boolean(dados.observacao), {
  message: 'Descreva o motivo na observação quando escolher "Outro".',
  path: ['observacao'],
});
