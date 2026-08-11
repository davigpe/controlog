import { jest } from '@jest/globals';
import { z } from 'zod';
import { validate } from '../src/middlewares/validate.js';
import { ValidationError } from '../src/utils/AppError.js';

const schema = z.object({ nome: z.string().min(2) });

describe('validate middleware', () => {
  test('lança ValidationError e não chama next() para dados inválidos', () => {
    const req = { body: { nome: 'a' } };
    const next = jest.fn();

    expect(() => validate(schema)(req, {}, next)).toThrow(ValidationError);
    expect(next).not.toHaveBeenCalled();
  });

  test('normaliza req.body e chama next() para dados válidos', () => {
    const req = { body: { nome: 'Carlos Silva' } };
    const next = jest.fn();

    validate(schema)(req, {}, next);

    expect(req.body).toEqual({ nome: 'Carlos Silva' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
