import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';

function sendError(res, req, status, body) {
  return res.status(status).json({ ...body, path: req.originalUrl });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return sendError(res, req, err.statusCode, {
      error: err.name,
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return sendError(res, req, 409, {
        error: 'ConflictError',
        message: `Já existe um registro com o mesmo valor para: ${err.meta?.target ?? 'campo único'}`,
      });
    }
    if (err.code === 'P2003') {
      return sendError(res, req, 409, {
        error: 'ConflictError',
        message: 'Operação bloqueada por um vínculo existente com outro registro.',
      });
    }
    if (err.code === 'P2025') {
      return sendError(res, req, 404, {
        error: 'NotFoundError',
        message: 'Recurso não encontrado.',
      });
    }
  }

  console.error(err);
  return sendError(res, req, 500, {
    error: 'InternalServerError',
    message: 'Erro interno no servidor.',
  });
}

export function notFoundHandler(req, res) {
  sendError(res, req, 404, {
    error: 'NotFoundError',
    message: `Rota ${req.method} ${req.originalUrl} não existe.`,
  });
}
