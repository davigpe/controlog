# Controlog — API REST

Backend do Controlog, seguindo a arquitetura descrita no RFC (Node.js + Express + PostgreSQL, autenticação JWT).

Em produção: https://controlog-backend-production.up.railway.app (hospedado no Railway — ver [`../docs/DEPLOY.md`](../docs/DEPLOY.md)).

## Stack

- Node.js (ESM) + Express
- PostgreSQL + Prisma ORM
- JWT (access + refresh token) e bcrypt para senhas
- Zod para validação de entrada
- Jest + Supertest para testes

## Pré-requisitos

- Node.js 20+
- Docker Desktop (para rodar o PostgreSQL localmente via Docker Compose)

> O `docker-compose.yml` publica o Postgres na porta **5433** do host (não 5432), porque
> é comum já existir um PostgreSQL nativo instalado ocupando a 5432. O container escuta
> internamente na 5432 normalmente. Se sua máquina não tem nada na 5432, você pode
> trocar para `5432:5432` à vontade — só mantenha `docker-compose.yml` e a porta em
> `DATABASE_URL` do `.env` sincronizados.

## Como rodar localmente

1. Copie o arquivo de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

2. Suba o banco de dados PostgreSQL:

   ```bash
   docker compose up -d
   ```

3. Instale as dependências:

   ```bash
   npm install
   ```

4. Gere o client do Prisma e aplique as migrations:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. (Opcional) Popule o banco com dados de exemplo, incluindo um usuário gestor de teste:

   ```bash
   npm run prisma:seed
   ```

   Login de teste criado pelo seed: `gestor@controlog.com` / `controlog123`.

6. Inicie a API em modo desenvolvimento:

   ```bash
   npm run dev
   ```

A API sobe em `http://localhost:3333`. Health check: `GET /health`.

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run dev` | Inicia a API com reload automático |
| `npm start` | Inicia a API em modo produção |
| `npm test` | Roda a suíte de testes |
| `npm run test:coverage` | Roda os testes com relatório de cobertura |
| `npm run prisma:migrate` | Cria/aplica migrations em desenvolvimento |
| `npm run prisma:studio` | Abre o Prisma Studio para inspecionar o banco |

## Testes

Os testes unitários injetam um Prisma Client mockado diretamente nos services (todos os services são fábricas `create*Service(prisma)`), então **não é necessário ter o banco rodando** para executar `npm test`. Cobertura atual: acima de 90% de statements/lines (meta do RFC, RNF07, é ≥70%).

## Autenticação

- `POST /api/auth/register` — cadastro público, sempre cria um usuário com perfil `OPERADOR`.
- `POST /api/auth/login` — retorna `accessToken` (expira em 1h) e `refreshToken` (expira em 7 dias).
- `POST /api/auth/refresh` — troca um refresh token válido por um novo access token.
- `GET /api/auth/me` — dados do usuário autenticado.

Todas as demais rotas sob `/api` exigem o header `Authorization: Bearer <accessToken>` (RN01).

Perfis de usuário: `GESTOR`, `OPERADOR`, `MOTORISTA`. Elevar um usuário a `GESTOR` é feito diretamente no banco (ou via seed) — não existe elevação de privilégio pelo endpoint público de cadastro.

## Endpoints principais

| Recurso | Rotas |
|---|---|
| Motoristas | `GET/POST /api/motoristas`, `GET/PUT/DELETE /api/motoristas/:id` |
| Veículos | `GET/POST /api/veiculos`, `GET/PUT/DELETE /api/veiculos/:id` |
| Rotas | `GET/POST /api/rotas`, `GET/PUT/DELETE /api/rotas/:id` |
| Entregas | `GET/POST /api/entregas`, `GET/PUT/DELETE /api/entregas/:id` |
| Dashboard | `GET /api/dashboard/resumo` |
| Relatórios | `GET /api/relatorios?dataInicio=...&dataFim=...` |

## Regras de negócio implementadas (RFC, seção 2.5)

| Regra | Onde está implementada |
|---|---|
| RN01 — apenas autenticados acessam a API | `src/routes/index.js` (middleware `requireAuth` global) |
| RN02 — reativar rota Concluída/Cancelada exige gestor | `src/services/rota.service.js` (`update`) |
| RN03 — não excluir motorista com rota ativa vinculada | `src/services/motorista.service.js` (`remove`) |
| RN04 — não excluir veículo com rota ativa vinculada | `src/services/veiculo.service.js` (`remove`) |
| RN05 — código da rota é único | `src/services/rota.service.js` (`create`/`update`) + `@unique` no schema |
| RN06 — rota exige origem, destino, motorista e veículo | `src/validators/rota.validators.js` (campos obrigatórios) |
| RN07 — entrega exige rota e motorista vinculados | `src/validators/entrega.validators.js` + `src/services/entrega.service.js` |
| RN08 — não excluir rota com entregas pendentes | `src/services/rota.service.js` (`remove`) |

## Notas de integração com o front-end

O front-end (`controlog-frontend`) hoje usa dados mockados em memória e não está conectado a esta API. Para integrar:

1. Trocar os arrays mockados (`rotasMock`, `initialEntregas`, `initialMotoristas`, `initialVeiculos`) por chamadas `axios`/`react-query` a estes endpoints.
2. Os enums do backend são em **maiúsculas** (`ATIVA`, `PENDENTE`, `GESTOR`...), enquanto o front hoje usa minúsculas (`ativa`, `pendente`...) — normalizar em um dos dois lados.
3. Guardar o `accessToken` (ex.: em memória + refresh silencioso) e implementar a tela de login, hoje inexistente no front.
