# syntax=docker/dockerfile:1

# Debian slim em vez de Alpine: o Prisma escolhe o engine pela versão do
# OpenSSL, e na musl do Alpine essa detecção é uma fonte conhecida de erro em
# tempo de execução. Os ~40 MB a mais não compensam o risco num deploy com
# prazo.
FROM node:22-bookworm-slim AS base
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

FROM base AS deps
# O schema entra antes do npm ci porque o postinstall do projeto roda
# `prisma generate`, que falha sem ele.
COPY package.json package-lock.json ./
COPY prisma ./prisma
# --include=dev apesar do NODE_ENV=production: o CLI do Prisma é
# devDependency e precisa sobreviver até o runtime, porque é ele que aplica
# as migrations quando o contêiner sobe (script `start`). Separar as deps de
# produção daria uma imagem menor, mas o CLI traz as próprias dependências e
# recortá-las à mão quebra a cada atualização do Prisma.
RUN npm ci --include=dev

FROM base AS runtime
# O npm quer um cache gravável mesmo só para rodar um script, e o usuário
# node não escreve em /app. Sem isto, o CMD pode falhar por permissão.
ENV NPM_CONFIG_CACHE=/tmp/.npm
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY src ./src

# Usuário sem privilégios que já vem na imagem oficial. A aplicação só lê o
# que foi copiado, então não precisa ser dona de nada.
USER node

EXPOSE 3333

# fetch global em vez de curl: evita instalar um pacote só para isto.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3333/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `start` = prisma migrate deploy && node src/server.js. Migrar na subida
# funciona porque há uma instância só; com várias réplicas, as migrations
# teriam de virar um passo próprio, antes do rollout.
CMD ["npm", "run", "start"]
