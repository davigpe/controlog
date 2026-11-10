import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';

const CLIENTE = '203.0.113.7';
const CADDY = '172.18.0.5';

/**
 * Mesma leitura que o express-rate-limit faz para identificar quem chamou.
 * Vai num app mínimo de propósito: o que está sob teste é a aritmética de
 * saltos do `trust proxy`, não as rotas do Controlog.
 */
function appQueDevolveOIp(saltos) {
  const app = express();
  app.set('trust proxy', saltos);
  app.get('/eco', (req, res) => res.json({ ip: req.ip }));
  return app;
}

describe('trust proxy', () => {
  test('createApp usa o valor do ambiente, não um número fixo', () => {
    expect(createApp().get('trust proxy')).toBe(env.trustProxy);
  });

  test('o padrão é 1, que é o deploy em HTTP (só o nginx na frente)', () => {
    expect(env.trustProxy).toBe(1);
  });

  // Em HTTP a cadeia é cliente → nginx → API, e o nginx escreve uma entrada
  // só no cabeçalho.
  test('com 1 proxy na frente, 1 salto encontra o cliente', async () => {
    const res = await request(appQueDevolveOIp(1))
      .get('/eco')
      .set('X-Forwarded-For', CLIENTE);

    expect(res.body.ip).toBe(CLIENTE);
  });

  // Em HTTPS a cadeia é cliente → Caddy → nginx → API: o Caddy escreve o IP
  // do cliente e o nginx acrescenta o do Caddy à direita. É por isso que o
  // docker-compose.https.yml pede TRUST_PROXY=2.
  test('com Caddy + nginx, 1 salto para no proxy e erra o cliente', async () => {
    const res = await request(appQueDevolveOIp(1))
      .get('/eco')
      .set('X-Forwarded-For', `${CLIENTE}, ${CADDY}`);

    expect(res.body.ip).toBe(CADDY);
  });

  test('com Caddy + nginx, 2 saltos encontram o cliente', async () => {
    const res = await request(appQueDevolveOIp(2))
      .get('/eco')
      .set('X-Forwarded-For', `${CLIENTE}, ${CADDY}`);

    expect(res.body.ip).toBe(CLIENTE);
  });
});
