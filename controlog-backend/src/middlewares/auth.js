import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError.js';

// RN01 — Apenas usuários autenticados podem acessar qualquer funcionalidade do sistema
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de acesso ausente.');
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, perfil: payload.perfil, nome: payload.nome };
    return next();
  } catch {
    throw new UnauthorizedError('Token de acesso inválido ou expirado.');
  }
}

export function requireRole(...perfis) {
  return (req, res, next) => {
    if (!req.user || !perfis.includes(req.user.perfil)) {
      throw new ForbiddenError(`Ação restrita ao(s) perfil(is): ${perfis.join(', ')}.`);
    }
    return next();
  };
}
