import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }
  return value;
}

/**
 * Lê um inteiro não negativo e recusa qualquer outra coisa.
 *
 * Com `Number()` puro, um TRUST_PROXY digitado errado viraria NaN e o Express
 * deixaria de confiar no X-Forwarded-For sem reclamar — o rate limiter
 * passaria a ver todo mundo como o mesmo cliente, e nada no log diria por quê.
 * Melhor a API não subir.
 */
function inteiroNaoNegativo(name, fallback) {
  const bruto = process.env[name];
  if (bruto === undefined || bruto === '') {
    return fallback;
  }
  const valor = Number(bruto);
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error(`Variável de ambiente ${name} deve ser um inteiro não negativo, e veio "${bruto}"`);
  }
  return valor;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: required(
    'DATABASE_URL',
    process.env.NODE_ENV === 'test'
      ? 'postgresql://controlog:controlog@localhost:5432/controlog_test?schema=public'
      : undefined
  ),
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'test' ? 'test-secret' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  jwtRefreshSecret: required(
    'JWT_REFRESH_SECRET',
    process.env.NODE_ENV === 'test' ? 'test-refresh-secret' : undefined
  ),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  // Quantos saltos de proxy reverso confiar no X-Forwarded-For. É desse
  // cabeçalho que o express-rate-limit tira o IP de quem chamou, então errar
  // o número joga todos os usuários no mesmo balde do limitador.
  //
  //   1 → só o nginx na frente (docker-compose.prod.yml, em HTTP)
  //   2 → Caddy + nginx (docker-compose.https.yml, em HTTPS)
  //
  // Cada proxy acrescenta à direita o IP de quem falou com ele, então um
  // proxy a mais na cadeia soma uma entrada ao cabeçalho.
  trustProxy: inteiroNaoNegativo('TRUST_PROXY', 1),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Opcional — sem essa chave, a otimização de rotas continua funcionando
  // normalmente, só sem o traçado real pelas ruas (cai pra linha reta).
  orsApiKey: process.env.ORS_API_KEY ?? '',
};
