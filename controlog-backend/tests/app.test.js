import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('app', () => {
  test('GET /health responde 200 com status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // RN01 — Apenas usuários autenticados podem acessar qualquer funcionalidade do sistema
  test('GET /api/rotas sem token responde 401', async () => {
    const res = await request(app).get('/api/rotas');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UnauthorizedError');
  });

  test('POST /api/otimizacao-rotas/otimizar sem token responde 401', async () => {
    const res = await request(app).post('/api/otimizacao-rotas/otimizar').send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UnauthorizedError');
  });

  test('rota inexistente responde 404', async () => {
    const res = await request(app).get('/rota-que-nao-existe');
    expect(res.status).toBe(404);
  });

  test('POST /api/auth/login com corpo inválido responde 422', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nao-e-email' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('ValidationError');
  });
});
