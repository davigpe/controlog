import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }
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
};
