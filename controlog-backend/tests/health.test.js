import { jest } from '@jest/globals';
import request from 'supertest';

import { createApp } from '../src/app.js';

// O incidente que originou o /health/db: a rotação automática da senha mestra
// do RDS invalidou a credencial, todo login passou a responder 500, e o
// /health seguiu devolvendo 200 por cinco horas porque não tocava no banco.
// O health check externo ficou verde o tempo inteiro.

describe('/health — liveness', () => {
  // Precisa continuar respondendo mesmo com o banco fora: é o que o
  // healthcheck do contêiner consulta, e banco indisponível não significa
  // processo quebrado.
  test('responde 200 mesmo com o banco inacessível', async () => {
    const prismaQuebrado = {
      $queryRaw: () => Promise.reject(new Error('Authentication failed')),
    };

    const resposta = await request(createApp({ prismaClient: prismaQuebrado })).get('/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('ok');
  });

  test('não consulta o banco', async () => {
    const prisma = { $queryRaw: jest.fn() };

    await request(createApp({ prismaClient: prisma })).get('/health');

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

describe('/health/db — readiness', () => {
  test('responde 200 quando o banco responde', async () => {
    const prisma = { $queryRaw: () => Promise.resolve([{ '?column?': 1 }]) };

    const resposta = await request(createApp({ prismaClient: prisma })).get('/health/db');

    expect(resposta.status).toBe(200);
    expect(resposta.body.banco).toBe('ok');
  });

  // O caso que importa: é esta resposta que faz o health check do Route 53
  // falhar e o alarme disparar.
  test('responde 503 quando a credencial do banco é recusada', async () => {
    const erroDoPrisma = new Error(
      'Authentication failed against database server, the provided database credentials for `controlog` are not valid.'
    );
    const prisma = { $queryRaw: () => Promise.reject(erroDoPrisma) };
    const silenciado = jest.spyOn(console, 'error').mockImplementation(() => {});

    const resposta = await request(createApp({ prismaClient: prisma })).get('/health/db');

    expect(resposta.status).toBe(503);
    expect(resposta.body.banco).toBe('inacessivel');
    silenciado.mockRestore();
  });

  test('a falha é registrada no log do servidor', async () => {
    const prisma = { $queryRaw: () => Promise.reject(new Error('fora do ar')) };
    const silenciado = jest.spyOn(console, 'error').mockImplementation(() => {});

    await request(createApp({ prismaClient: prisma })).get('/health/db');

    expect(silenciado).toHaveBeenCalled();
    expect(String(silenciado.mock.calls[0][0])).toContain('health/db');
    silenciado.mockRestore();
  });

  // A resposta é pública: não pode devolver host, usuário nem detalhe interno.
  test('a resposta não vaza detalhe do erro para o cliente', async () => {
    const prisma = {
      $queryRaw: () =>
        Promise.reject(new Error('credentials for `controlog` at db.interno:5432 are not valid')),
    };
    const silenciado = jest.spyOn(console, 'error').mockImplementation(() => {});

    const resposta = await request(createApp({ prismaClient: prisma })).get('/health/db');

    const corpo = JSON.stringify(resposta.body);
    expect(corpo).not.toContain('controlog');
    expect(corpo).not.toContain('db.interno');
    expect(corpo).not.toMatch(/senha|password|credential/i);
    silenciado.mockRestore();
  });
});
