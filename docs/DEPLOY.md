# Deploy — Controlog

O Controlog está publicado em produção. Este documento registra a arquitetura de
deploy, as URLs, e como reproduzir/atualizar o ambiente.

## URLs de produção

| Serviço | URL |
|---|---|
| Frontend | https://controlog-frontend-production.up.railway.app |
| Backend (API) | https://controlog-backend-production.up.railway.app |
| Health check | https://controlog-backend-production.up.railway.app/health |

Login de teste: `gestor@controlog.com` / `controlog123`.

## Por que Railway (e não Vercel/Netlify/Firebase/Render)

A partir de 2026-02, a disciplina não aceita hospedagem em plataformas otimizadas
apenas para frontend estático (Vercel, Netlify, Firebase, Render), com ou sem backend
próprio. O **Railway** foi escolhido porque é uma plataforma de infraestrutura geral —
hospeda containers, bancos de dados e processos de longa duração — não uma plataforma
especializada em servir arquivos estáticos/edge. Os três componentes do projeto
(frontend, backend, PostgreSQL) rodam como serviços separados dentro do **mesmo
projeto Railway** (`controlog`).

## Arquitetura de deploy

```
Projeto Railway "controlog" (ambiente "production")
├── Postgres              → banco gerenciado, rede privada (postgres.railway.internal)
├── controlog-backend     → Node.js/Express, migrations rodam automaticamente no start
└── controlog-frontend    → build estático do Vite, servido por `serve` (pacote npm)
```

- O **backend** roda `prisma migrate deploy && node src/server.js` a cada deploy —
  qualquer migration pendente é aplicada automaticamente antes do servidor subir.
- O **frontend** é buildado (`tsc -b && vite build`) e o resultado estático
  (`dist/`) é servido pelo pacote `serve`, com fallback de SPA (`-s`) para que rotas
  do React Router (`/motoristas`, `/rotas`, etc.) funcionem em acesso direto/refresh,
  não só navegando pela aplicação.
- `VITE_API_URL` é uma variável de **build time** do Vite — precisa estar definida no
  serviço do frontend *antes* do `npm run build` rodar, porque o Vite embute esse valor
  no bundle final. Já está configurada no serviço `controlog-frontend`.
- `CORS_ORIGIN` no backend aponta para a URL pública do frontend, para o navegador
  aceitar as respostas da API.
- `DATABASE_URL` no backend usa a variável de referência `${{Postgres.DATABASE_URL}}`
  do Railway — se o Postgres for recriado, essa referência resolve sozinha, não precisa
  editar nada manualmente.

## CI/CD

- **CI** — a cada `push`/`pull request` para `main`, o workflow
  [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) roda os testes do backend
  (Jest) e do frontend (lint + build + Vitest) no GitHub Actions.
- **CD** — `controlog-backend` e `controlog-frontend` estão conectados ao repositório
  GitHub (`davigpe/controlog`) como fonte de deploy no Railway, cada um com um
  **Root Directory** apontando para a sua respectiva pasta e um **Watch Pattern**
  (`controlog-backend/**` / `controlog-frontend/**`) para que um push só redeploye o
  serviço cuja pasta mudou. Um `git push` para `main` já é suficiente para publicar —
  não é mais necessário rodar `railway up` manualmente.

## Variáveis de ambiente configuradas

**`controlog-backend`**

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência automática) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | gerados com `crypto.randomBytes(48)`, únicos de produção (não são os mesmos do `.env.example`) |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `1h` / `7d` |
| `CORS_ORIGIN` | `https://controlog-frontend-production.up.railway.app` |

**`controlog-frontend`**

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `https://controlog-backend-production.up.railway.app/api` |

## Como reproduzir (do zero)

Pré-requisito: `npm install -g @railway/cli` (ou use via `npx @railway/cli`) e uma conta Railway.

```bash
railway login                                  # abre o navegador para autenticar
railway init --name controlog                  # cria o projeto

# Banco
railway add --database postgres

# Backend
cd controlog-backend
railway add --service controlog-backend
railway service link controlog-backend
railway variable set NODE_ENV=production --service controlog-backend
railway variable set "DATABASE_URL=\${{Postgres.DATABASE_URL}}" --service controlog-backend
railway variable set "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")" --service controlog-backend
railway variable set "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")" --service controlog-backend
railway variable set JWT_EXPIRES_IN=1h --service controlog-backend
railway variable set JWT_REFRESH_EXPIRES_IN=7d --service controlog-backend
railway up --service controlog-backend --detach
railway domain --service controlog-backend      # gera a URL pública

# Frontend (depois de saber a URL do backend acima)
cd ../controlog-frontend
railway service link controlog-frontend
railway variable set "VITE_API_URL=https://<url-do-backend>/api" --service controlog-frontend
railway up --service controlog-frontend --detach
railway domain --service controlog-frontend      # gera a URL pública

# Por fim, aponte o CORS do backend para a URL real do frontend
railway variable set "CORS_ORIGIN=https://<url-do-frontend>" --service controlog-backend

# Conectar cada serviço ao repositório GitHub para deploy automático a cada push
railway service source connect --repo davigpe/controlog --branch main --service controlog-backend
railway service source connect --repo davigpe/controlog --branch main --service controlog-frontend
# Root Directory e Watch Patterns são definidos via API GraphQL (railway api),
# porque a CLI não expõe esses campos diretamente:
#   serviceInstanceUpdate(serviceId, environmentId, input: { rootDirectory, watchPatterns })
```

### Popular o banco com dados de exemplo

As migrations rodam sozinhas no deploy. O seed (dados de exemplo + usuário de teste)
precisa ser rodado manualmente uma vez, porque não deve rodar a cada deploy. Como o
Postgres do Railway só é acessível pela rede privada do projeto, a forma mais simples é
expor um proxy TCP temporário, rodar o seed local apontando para ele, e depois remover
o proxy:

```bash
railway tcp-proxy create --port 5432 --service Postgres --json
# use o "endpoint" retornado para montar uma DATABASE_URL pública temporária
DATABASE_URL="postgresql://postgres:<senha>@<proxy-host>:<proxy-port>/railway" \
  node controlog-backend/prisma/seed.js
railway tcp-proxy delete <proxy-id> --service Postgres --yes
```

## Redeploy

O fluxo normal é `git push` para `main`: o GitHub dispara o deploy automaticamente nos
serviços conectados (ver seção CI/CD acima). `railway up --service <nome>` continua
disponível para um deploy manual pontual a partir do diretório atual, mas só deve ser
usado a partir da raiz do serviço correspondente **sem** que isso conflite com o Root
Directory configurado — em caso de dúvida, prefira o push. Trocar uma variável de
ambiente (`railway variable set ...`) também dispara um redeploy automático do serviço
afetado, a menos que `--skip-deploys` seja usado.

## Limitações conhecidas

- Sem domínio customizado — usa os subdomínios `*.up.railway.app` gerados pela
  plataforma.
- O Railway não bloqueia o deploy se o CI falhar (não usamos a opção "Wait for CI") —
  os testes do GitHub Actions são um sinal para revisão manual antes de mergear em
  `main`, não um gate automático de deploy.
