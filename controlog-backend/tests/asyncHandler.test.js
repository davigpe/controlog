import { jest } from '@jest/globals';
import { asyncHandler } from '../src/utils/asyncHandler.js';

describe('asyncHandler', () => {
  test('encaminha o erro de uma promise rejeitada para next()', async () => {
    const erro = new Error('falha assíncrona');
    const handler = asyncHandler(async () => {
      throw erro;
    });
    const next = jest.fn();

    await handler({}, {}, next);

    expect(next).toHaveBeenCalledWith(erro);
  });

  test('não chama next() quando a promise resolve com sucesso', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.json({ ok: true });
    });
    const res = { json: jest.fn() };
    const next = jest.fn();

    await handler({}, res, next);

    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });
});
