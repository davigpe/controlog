import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'ConflictError',
        message: `Já existe um registro com o mesmo valor para: ${err.meta?.target ?? 'campo único'}`,
      });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({
        error: 'ConflictError',
        message: 'Operação bloqueada por um vínculo existente com outro registro.',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Recurso não encontrado.',
      });
    }
  }

  console.error(err);
  return res.status(500).json({
    error: 'InternalServerError',
    message: 'Erro interno no servidor.',
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NotFoundError',
    message: `Rota ${req.method} ${req.originalUrl} não existe.`,
  });
}
