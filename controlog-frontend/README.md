# Controlog — Frontend

SPA do Controlog, consumindo a API REST em `controlog-backend`.

Em produção: https://controlog-frontend-production.up.railway.app (hospedado no Railway — ver [`../docs/DEPLOY.md`](../docs/DEPLOY.md)).

## Stack

- React 19 + TypeScript + Vite
- TailwindCSS + shadcn/ui (Radix) para os componentes de UI
- TanStack Query para estado de servidor (cache, invalidação, refetch)
- React Hook Form + Zod para formulários e validação
- Zustand (+ `persist`) para o estado de autenticação
- Axios com interceptor de refresh automático de token
- Leaflet/react-leaflet para o mapa de rotas, Recharts para os gráficos de Relatórios
- Vitest + Testing Library (+ `vitest-axe`) para os testes

## Pré-requisitos

- Node.js 22.12+ (definido em `engines` no `package.json` — necessário para o Vite 8)
- Backend (`controlog-backend`) rodando, ou `VITE_API_URL` apontando para uma API já publicada

## Como rodar localmente

1. Copie o arquivo de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

A aplicação sobe em `http://localhost:5173` e espera a API em `VITE_API_URL` (padrão `http://localhost:3333/api`, ver [`../controlog-backend/README.md`](../controlog-backend/README.md) para subir o backend).

Login de teste (criado pelo seed do backend): `gestor@controlog.com` / `controlog123`.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base da API (ex.: `http://localhost:3333/api` em dev, `https://.../api` em produção) |

`VITE_API_URL` é lida em **build time** pelo Vite — em produção precisa estar definida no ambiente *antes* do `npm run build` rodar, porque o valor é embutido no bundle final.

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento (Vite) |
| `npm run build` | Type-check (`tsc -b`) + build de produção (`dist/`) |
| `npm run preview` | Serve o build de produção localmente para conferência |
| `npm start` | Serve `dist/` já buildado (usado em produção, via `serve`) |
| `npm run lint` | ESLint |
| `npm test` | Roda a suíte de testes |
| `npm run test:coverage` | Roda os testes com relatório de cobertura |

## Estrutura

```
src/
├── pages/           # um módulo por tela (Dashboard, Rotas, Motoristas, Veículos,
│                     # Entregas, Relatórios, Login, EsqueciSenha, RedefinirSenha),
│                     # cada um com index.tsx, api.ts (hooks TanStack Query) e types.ts
├── components/
│   ├── ui/           # componentes shadcn/ui (gerados — evite editar à mão)
│   ├── shared/        # componentes reaproveitados entre páginas (ConfirmDialog, Pagination)
│   ├── layout/         # Sidebar, Header
│   └── auth/            # RequireAuth (guarda de rota)
├── stores/          # authStore (Zustand + persist)
├── lib/             # cliente Axios (api.ts) e utilitários
└── test/            # helpers de teste (renderWithProviders, axeHelper, fixtures)
```

## Testes

Os testes mockam o cliente `api` (Axios) diretamente, então **não é necessário ter o
backend rodando** para executar `npm test`. Cobertura atual: acima de 70% de
statements/branches/functions/lines (meta do RFC, RNF07).

Há também uma suíte de regressão de acessibilidade (`src/test/a11y.test.tsx`, via
`vitest-axe`) cobrindo as principais telas e estados. Detalhes da auditoria completa
(incluindo contraste de cor, verificado à parte em navegador real) em
[`../docs/AUDITORIA_ACESSIBILIDADE.md`](../docs/AUDITORIA_ACESSIBILIDADE.md).

## Autenticação

- Token de acesso e refresh token ficam no `authStore` (Zustand), persistidos em
  `localStorage` sob a chave `controlog-auth`.
- O interceptor de resposta do Axios (`src/lib/api.ts`) detecta `401`, tenta renovar o
  access token via refresh token automaticamente e reenvia a requisição original; se o
  refresh falhar, faz logout e redireciona para `/login`.
- `RequireAuth` (`src/components/auth/RequireAuth.tsx`) protege todas as rotas exceto
  `/login`, `/esqueci-senha` e `/redefinir-senha`.
