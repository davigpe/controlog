import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }
  return value;
}

// Quantos proxies reversos ficam entre o cliente e a API (Express "trust proxy").
// Em produção a API roda atrás do proxy do Railway, então o padrão é 1; localmente
// não há proxy, e confiar no X-Forwarded-For deixaria o cliente forjar o próprio IP.
// Aceita um número de proxies (ex.: 1), `false` ou um valor suportado pelo Express
// (sub-rede/CIDR). Usado pelo rate limit (RNF04) pra identificar o IP real.
export function parseTrustProxy(value, nodeEnv) {
  if (value === undefined || value === '') return nodeEnv === 'production' ? 1 : false;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
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
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, process.env.NODE_ENV),
  // Opcional — sem essa chave, a otimização de rotas continua funcionando
  // normalmente, só sem o traçado real pelas ruas (cai pra linha reta).
  orsApiKey: process.env.ORS_API_KEY ?? '',
};
