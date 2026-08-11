import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ConflictError, UnauthorizedError } from '../utils/AppError.js';

const SALT_ROUNDS = 12;

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
  };
}
