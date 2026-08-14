import { z } from 'zod';

// O autocadastro público sempre cria um usuário OPERADOR — elevar para GESTOR
// ou MOTORISTA exige um gestor autenticado alterando o perfil posteriormente,
// evitando escalonamento de privilégio via /auth/register.
export const registerSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(1, 'Senha é obrigatória.'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken é obrigatório.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório.'),
  novaSenha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
});
