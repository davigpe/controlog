import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../utils/AppError.js';

const SALT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRA_MS = 60 * 60 * 1000; // 1h

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const publicUser = (usuario) => ({
  id: usuario.id,
  nome: usuario.nome,
  email: usuario.email,
  perfil: usuario.perfil,
});

function signAccessToken(usuario) {
  return jwt.sign({ perfil: usuario.perfil, nome: usuario.nome }, env.jwtSecret, {
    subject: usuario.id,
    expiresIn: env.jwtExpiresIn,
  });
}

function signRefreshToken(usuario) {
  return jwt.sign({}, env.jwtRefreshSecret, {
    subject: usuario.id,
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

export function createAuthService(prisma) {
  return {
    async register({ nome, email, senha }) {
      const existente = await prisma.usuario.findUnique({ where: { email } });
      if (existente) {
        throw new ConflictError('Já existe um usuário cadastrado com este e-mail.');
      }

      const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
      const usuario = await prisma.usuario.create({
        data: { nome, email, senhaHash, perfil: 'OPERADOR' },
      });

      return {
        usuario: publicUser(usuario),
        accessToken: signAccessToken(usuario),
        refreshToken: signRefreshToken(usuario),
      };
    },

    async login({ email, senha }) {
      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (!usuario) {
        throw new UnauthorizedError('E-mail ou senha inválidos.');
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
      if (!senhaValida) {
        throw new UnauthorizedError('E-mail ou senha inválidos.');
      }

      return {
        usuario: publicUser(usuario),
        accessToken: signAccessToken(usuario),
        refreshToken: signRefreshToken(usuario),
      };
    },

    async refresh(refreshToken) {
      let payload;
      try {
        payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
      } catch {
        throw new UnauthorizedError('Refresh token inválido ou expirado.');
      }

      const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub } });
      if (!usuario) {
        throw new UnauthorizedError('Usuário não encontrado.');
      }

      return { accessToken: signAccessToken(usuario) };
    },

    async me(userId) {
      const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
      if (!usuario) {
        throw new UnauthorizedError('Usuário não encontrado.');
      }
      return publicUser(usuario);
    },

    // Não há provedor de e-mail configurado neste projeto (não é um domínio de
    // produção com envio transacional) — o link de redefinição é registrado no
    // log do servidor em vez de enviado por e-mail. Ver docs/DEPLOY.md.
    // Sempre retorna sucesso independente do e-mail existir, para não permitir
    // enumeração de usuários cadastrados através deste endpoint público.
    async solicitarResetSenha(email) {
      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (!usuario) return;

      const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          resetTokenHash: hashResetToken(token),
          resetTokenExpiraEm: new Date(Date.now() + RESET_TOKEN_EXPIRA_MS),
        },
      });

      const link = `${env.corsOrigin}/redefinir-senha?token=${token}`;
      console.log(`[reset-senha] Link de redefinição para ${email}: ${link}`);
    },

    async redefinirSenha({ token, novaSenha }) {
      const usuario = await prisma.usuario.findFirst({
        where: { resetTokenHash: hashResetToken(token) },
      });
      if (!usuario || !usuario.resetTokenExpiraEm || usuario.resetTokenExpiraEm < new Date()) {
        throw new ValidationError('Token de redefinição inválido ou expirado.');
      }

      const senhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { senhaHash, resetTokenHash: null, resetTokenExpiraEm: null },
      });
    },
  };
}
