import { Prisma } from '@prisma/client';
import { TAMANHO_MAXIMO_BYTES } from '../config/comprovantes.js';
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

  // O body-parser recusa corpo acima do limite com type 'entity.too.large' e
  // status 413, mas é um Error comum, não um AppError — sem este caso ele
  // caía no 500 genérico e a pessoa importando uma planilha grande recebia
  // "Erro interno no servidor", sem pista do que fazer.
  if (err?.type === 'entity.too.large') {
    return sendError(res, req, 413, {
      error: 'PayloadTooLargeError',
      message:
        'O conteúdo enviado é grande demais. Divida a planilha em lotes menores e tente de novo.',
    });
  }

  // O multer tem erros próprios, que não herdam de AppError. O mais provável
  // na prática é o motorista mandar a foto original do celular quando a
  // redução no navegador falhou — e "Erro interno no servidor" não diria a
  // ele o que fazer.
  if (err?.name === 'MulterError') {
    const mensagens = {
      LIMIT_FILE_SIZE: `O arquivo é grande demais (limite de ${Math.round(TAMANHO_MAXIMO_BYTES / 1024 / 1024)} MB). Tire a foto com qualidade menor ou envie um arquivo mais leve.`,
      LIMIT_FILE_COUNT: 'Envie um arquivo por vez.',
      LIMIT_UNEXPECTED_FILE: 'Campo de arquivo inesperado. O comprovante deve vir no campo "arquivo".',
    };
    return sendError(res, req, err.code === 'LIMIT_FILE_SIZE' ? 413 : 422, {
      error: 'ValidationError',
      message: mensagens[err.code] ?? 'Não foi possível receber o arquivo enviado.',
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
