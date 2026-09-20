# Deploy — Controlog

Este documento registra a arquitetura de deploy, as URLs, e como reproduzir/atualizar
o ambiente de produção na Vercel + Neon.

## URLs de produção

| Serviço | URL |
|---|---|
| Frontend | https://controlog-frontend.vercel.app _(atualizar após o primeiro deploy)_ |
| Backend (API) | https://controlog-backend.vercel.app _(atualizar após o primeiro deploy)_ |
| Health check | https://controlog-backend.vercel.app/health |

Login de teste: `gestor@controlog.com` / `controlog123`.

## Nota sobre a restrição de plataforma da disciplina

A partir de 2026-02, a disciplina passou a não aceitar hospedagem em plataformas
otimizadas apenas para frontend estático (Vercel, Netlify, Firebase, Render) — critério
que levou à escolha original do Railway. Essa restrição formalmente continua valendo;
a migração para Vercel foi uma decisão consciente do autor do projeto, ciente disso.

## Arquitetura de deploy

```
Dois projetos Vercel (mesmo repositório GitHub, cada um com Root Directory próprio)
├── controlog-backend    → Serverless Function (Express embrulhado em api/index.js)
└── controlog-frontend   → build estático do Vite (dist/), com rewrite de SPA

Banco: Neon (Postgres serverless, fora da Vercel)
```

- O **backend** não roda mais como processo de longa duração — `api/index.js` exporta
  o mesmo `createApp()` de sempre (`src/app.js`, inalterado) como handler serverless.
  O `vercel.json` do backend reescreve **todo** path pra essa function; o próprio
  Express continua roteando `/health` e `/api/*` internamente, então nada mudou nas
  rotas em si. As migrations (`prisma migrate deploy`) rodam no **build** (script
  `vercel-build` do `package.json`, detectado automaticamente pela Vercel), não mais
  no boot do processo — não existe "boot" persistente em serverless.
- O **frontend** é buildado (`tsc -b && vite build`, via `npm run build`) e o `dist/`
  é servido diretamente pela Vercel (hospedagem estática nativa) — o rewrite de SPA no
  `vercel.json` do frontend faz o papel que o `serve -s` fazia no Railway, pra rotas do
  React Router funcionarem em acesso direto/refresh.
- `VITE_API_URL` continua sendo uma variável de **build time** do Vite — precisa estar
  definida no projeto do frontend na Vercel *antes* do build rodar, porque o Vite
  embute esse valor no bundle final.
- `CORS_ORIGIN` no backend aponta para a URL pública de produção do frontend. É uma
  origem única (não uma lista) — ver limitação sobre preview deployments abaixo.
- `DATABASE_URL`/`DIRECT_URL` apontam para o Neon: a primeira usa o host com
  `-pooler` (usada em runtime pela API, essencial porque cada invocação da function
  pode abrir sua própria conexão — sem pooler o Postgres esgota conexões rápido); a
  segunda é a connection string direta, sem pooler, usada só pelo Prisma CLI em
  `migrate deploy`.

## CI/CD

- **CI** — a cada `push`/`pull request` para `main`, o workflow
  [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) roda os testes do backend
  (Jest) e do frontend (lint + build + Vitest) no GitHub Actions. Não muda nada aqui —
  o CI nunca teve nada específico do Railway.
- **CD** — `controlog-backend` e `controlog-frontend` são dois projetos Vercel
  separados, cada um linkado ao repositório GitHub (`davigpe/controlog`) com Root
  Directory apontando pra sua respectiva pasta (configurado automaticamente ao rodar
  `vercel link` de dentro de cada pasta — diferente do Railway, não precisa de
  chamada de API separada pra isso). Um `git push` para `main` já é suficiente pra
  publicar as duas partes; cada projeto só rebuilda quando algo na sua própria pasta
  muda (comportamento padrão da Vercel em monorepo via "Ignored Build Step").

## Variáveis de ambiente configuradas

**`controlog-backend`**

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` (definida automaticamente pela Vercel) |
| `DATABASE_URL` | connection string do Neon **com** `-pooler` |
| `DIRECT_URL` | connection string do Neon **sem** `-pooler` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | gerados com `crypto.randomBytes(48)`, únicos de produção (não são os mesmos do `.env.example`) |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `1h` / `7d` |
| `CORS_ORIGIN` | `https://controlog-frontend.vercel.app` (URL real de produção do frontend) |
| `ORS_API_KEY` | opcional — chave da OpenRouteService |

**`controlog-frontend`**

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `https://controlog-backend.vercel.app/api` (URL real de produção do backend) |

## Como reproduzir (do zero)

Pré-requisitos: `npm install -g vercel` (CLI da Vercel) e contas na [Vercel](https://vercel.com)
e na [Neon](https://neon.tech).

### 1. Banco (Neon)

Criar um projeto no painel da Neon e copiar as duas connection strings da aba
"Connection Details": a **pooled** (com `-pooler` no host) e a **direct** (sem).
Guarde as duas — vão virar `DATABASE_URL` e `DIRECT_URL` do backend.

### 2. Backend

```bash
cd controlog-backend
vercel login                     # abre o navegador para autenticar
vercel link                      # cria/linka o projeto Vercel com Root Directory = esta pasta

vercel env add DATABASE_URL production     # cole a connection string COM -pooler
vercel env add DIRECT_URL production       # cole a connection string SEM -pooler
vercel env add JWT_SECRET production       # node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
vercel env add JWT_REFRESH_SECRET production
vercel env add JWT_EXPIRES_IN production           # 1h
vercel env add JWT_REFRESH_EXPIRES_IN production   # 7d
vercel env add CORS_ORIGIN production      # preencher depois de saber a URL do frontend (passo 3)

vercel --prod                    # primeiro deploy manual — mostra a URL pública gerada
```

### 3. Frontend (depois de saber a URL do backend acima)

```bash
cd ../controlog-frontend
vercel login
vercel link

vercel env add VITE_API_URL production     # https://<url-do-backend>/api

vercel --prod                    # mostra a URL pública gerada
```

### 4. Fechar o ciclo

```bash
cd ../controlog-backend
vercel env add CORS_ORIGIN production --force   # agora com a URL real do frontend
vercel --prod                    # redeploy pra pegar o CORS_ORIGIN atualizado
```

### 5. Conectar ao GitHub pra deploy automático a cada push

Em cada pasta (`controlog-backend` e `controlog-frontend`):

```bash
vercel git connect
```

Depois, no painel de cada projeto → **Settings → Git**, confirme que a
**Production Branch** é `main`.

### Popular o banco com dados de exemplo

As migrations rodam sozinhas no build (`vercel-build`). O seed (dados de exemplo +
usuário de teste) precisa ser rodado manualmente uma vez — diferente do Railway, o
Neon é acessível publicamente por padrão, então não precisa de proxy nenhum:

```bash
DATABASE_URL="<direct-connection-string-do-neon>" node controlog-backend/prisma/seed.js
```

## Redeploy

O fluxo normal é `git push` para `main`: o GitHub dispara o deploy automaticamente nos
dois projetos conectados (ver seção CI/CD acima). `vercel --prod` (rodado de dentro da
pasta do serviço correspondente) continua disponível para um deploy manual pontual.
Trocar uma variável de ambiente pelo painel ou `vercel env add` não redeploya sozinho —
rode `vercel --prod` de novo depois de mudar uma variável.

## Limitações conhecidas

- **CORS de origem única** — `CORS_ORIGIN` aceita uma única URL. Cada push em uma
  branch que não seja `main` gera um preview deployment do frontend com uma URL
  própria, que **não** vai conseguir chamar o backend de produção (CORS vai
  bloquear). Pro escopo atual (deploy de produção via `main`), isso é aceitável — se
  precisar que previews funcionem contra a API, `CORS_ORIGIN` precisaria virar uma
  lista/regex em `src/config/env.js` e `src/app.js`.
- **Cold starts** — a primeira requisição depois de um tempo sem tráfego pode demorar
  um pouco mais (a function precisa subir uma instância nova).
- **Sem domínio customizado** — usa os subdomínios `*.vercel.app` gerados pela
  plataforma.
- A Vercel não bloqueia o deploy se o CI falhar — os testes do GitHub Actions são um
  sinal para revisão manual antes de mergear em `main`, não um gate automático de
  deploy.
