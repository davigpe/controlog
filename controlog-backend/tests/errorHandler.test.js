import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { errorHandler, notFoundHandler } from '../src/middlewares/errorHandler.js';
import { ConflictError } from '../src/utils/AppError.js';

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('responde com o statusCode e a mensagem de um AppError', () => {
    const res = buildRes();
    errorHandler(new ConflictError('conflito de teste'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'ConflictError', message: 'conflito de teste' })
    );
  });

  test('traduz erro P2002 do Prisma (violação de campo único) em 409', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('unique violation', {
      code: 'P2002',
      clientVersion: '6.0.0',
      meta: { target: ['codigo'] },
    });

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('traduz erro P2003 do Prisma (violação de chave estrangeira) em 409', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('fk violation', {
      code: 'P2003',
      clientVersion: '6.0.0',
    });

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('traduz erro P2025 do Prisma (registro não encontrado) em 404', () => {
    const res = buildRes();
    const err = new Prisma.PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: '6.0.0',
    });

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('responde 500 para erros não mapeados', () => {
    const res = buildRes();
    errorHandler(new Error('boom'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'InternalServerError' })
    );
  });

  test('notFoundHandler responde 404 com o método e a rota solicitada', () => {
    const res = buildRes();
    notFoundHandler({ method: 'GET', originalUrl: '/inexistente' }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('/inexistente') })
    );
  });
});
