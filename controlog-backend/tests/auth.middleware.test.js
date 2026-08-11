import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { requireAuth, requireRole } from '../src/middlewares/auth.js';
import { ForbiddenError, UnauthorizedError } from '../src/utils/AppError.js';

function buildReqRes(headers = {}) {
  return {
    req: { headers },
    res: {},
    next: jest.fn(),
  };
}

describe('requireAuth', () => {
  test('lança UnauthorizedError quando não há header Authorization', () => {
    const { req, res, next } = buildReqRes();
    expect(() => requireAuth(req, res, next)).toThrow(UnauthorizedError);
  });

  test('lança UnauthorizedError para token inválido', () => {
    const { req, res, next } = buildReqRes({ authorization: 'Bearer token-invalido' });
    expect(() => requireAuth(req, res, next)).toThrow(UnauthorizedError);
  });

  test('popula req.user e chama next() para token válido', () => {
    const token = jwt.sign({ perfil: 'GESTOR', nome: 'Ricardo' }, env.jwtSecret, {
      subject: 'user-1',
      expiresIn: '1h',
    });
    const { req, res, next } = buildReqRes({ authorization: `Bearer ${token}` });

    requireAuth(req, res, next);

    expect(req.user).toEqual({ id: 'user-1', perfil: 'GESTOR', nome: 'Ricardo' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('requireRole', () => {
  test('lança ForbiddenError quando perfil do usuário não está na lista permitida', () => {
    const req = { user: { perfil: 'OPERADOR' } };
    const next = jest.fn();

    expect(() => requireRole('GESTOR')(req, {}, next)).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  test('chama next() quando perfil do usuário está na lista permitida', () => {
    const req = { user: { perfil: 'GESTOR' } };
    const next = jest.fn();

    requireRole('GESTOR', 'OPERADOR')(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
