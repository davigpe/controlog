import { z } from 'zod';

import { booleanoDeQuery } from './comum.validators.js';

export const createMotoristaSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  cnh: z.string().trim().min(5, 'CNH inválida.'),
  telefone: z.string().trim().min(8, 'Telefone inválido.'),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
});

export const updateMotoristaSchema = createMotoristaSchema.partial();

// Acesso criado por um gestor para um motorista já cadastrado — o nome do
// usuário vem do próprio cadastro do motorista, então não é informado aqui.
export const criarAcessoMotoristaSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
});

// ─── Importação em lote (planilha) ────────────────────────────────────────
// Teto por requisição: a importação roda numa transação só, e um lote muito
// grande estoura o timeout do Prisma contra um banco remoto. 500 cobre com
// folga a frota de uma transportadora de porte médio.
export const LIMITE_IMPORTACAO_MOTORISTAS = 500;

export const importarMotoristasSchema = z.object({
  // Aqui cada item entra como desconhecido de propósito: quem valida linha a
  // linha é o service, via validarLinhaMotorista. Se o schema rejeitasse o
  // array inteiro, a resposta diria "motoristas.37.cnh: CNH inválida", que
  // não ajuda quem está olhando a planilha aberta na tela.
  motoristas: z
    .array(z.unknown())
    .min(1, 'A planilha não tem nenhuma linha preenchida.')
    .max(
      LIMITE_IMPORTACAO_MOTORISTAS,
      `Importe no máximo ${LIMITE_IMPORTACAO_MOTORISTAS} motoristas por vez.`
    ),
});

/**
 * Valida uma linha da planilha. Devolve o problema em vez de lançar, porque a
 * importação precisa seguir até o fim e juntar todos os erros numa lista só —
 * mandar o usuário corrigir uma linha por vez seria insuportável.
 */
export function validarLinhaMotorista(linha) {
  const resultado = createMotoristaSchema.safeParse(linha);
  if (resultado.success) return { ok: true, motorista: resultado.data };

  const problema = resultado.error.issues[0];
  const campo = problema.path.join('.');
  return { ok: false, mensagem: campo ? `${campo}: ${problema.message}` : problema.message };
}

export const listMotoristasQuerySchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
  emRota: booleanoDeQuery.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
