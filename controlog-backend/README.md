# Controlog — API REST

Backend do Controlog, seguindo a arquitetura descrita no RFC (Node.js + Express + PostgreSQL, autenticação JWT).

Em produção: https://controlog-backend.vercel.app _(atualizar após o primeiro deploy)_ (hospedado na Vercel como Serverless Function — ver [`../docs/DEPLOY.md`](../docs/DEPLOY.md)).

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

Os testes unitários injetam um Prisma Client mockado diretamente nos services (todos os services são fábricas `create*Service(prisma)`), então **não é necessário ter o banco rodando** para executar `npm test`. Cobertura atual: 182 testes, acima de 90% de statements/lines (meta do RFC, RNF07, é ≥70%).

## Autenticação

- `POST /api/auth/register` — cadastro público, sempre cria um usuário com perfil `OPERADOR`.
- `POST /api/auth/login` — retorna `accessToken` (expira em 1h) e `refreshToken` (expira em 7 dias).
- `POST /api/auth/refresh` — troca um refresh token válido por um novo access token.
- `GET /api/auth/me` — dados do usuário autenticado.
- `POST /api/auth/esqueci-senha` — `{ email }`. Sempre responde 200 com mensagem genérica
  (não revela se o e-mail existe). Não há provedor de e-mail configurado neste projeto —
  o link de redefinição é registrado no log do servidor em vez de enviado por e-mail.
- `POST /api/auth/redefinir-senha` — `{ token, novaSenha }`. Token expira em 1h.

Todas as demais rotas sob `/api` exigem o header `Authorization: Bearer <accessToken>` (RN01).

`/auth/login`, `/auth/esqueci-senha` e `/auth/redefinir-senha` têm um rate limit dedicado
(10 tentativas/15min por IP + e-mail), além do limite global da API.

Perfis de usuário: `GESTOR`, `OPERADOR`, `MOTORISTA`. Elevar um usuário a `GESTOR` é feito diretamente no banco (ou via seed) — não existe elevação de privilégio pelo endpoint público de cadastro.

O login de um motorista é criado por um gestor em `POST /api/motoristas/:id/acesso`
(`{ email, senha }`): cria um `Usuario` com perfil `MOTORISTA` e o vincula ao cadastro
operacional pelo campo `motoristas.usuario_id`. Quem entra com esse perfil só alcança
`GET /api/minhas-rotas` — as rotas de gestão respondem `403`, e o inverso também vale
(gestor/operador recebem `403` em `/api/minhas-rotas`). O recorte está em
`src/routes/index.js`, via `requireRole`.

O motorista pode fazer duas escritas, ambas sobre entregas dele:
`PATCH /api/minhas-rotas/entregas/:id/concluir` grava `status: ENTREGUE` e
`dataEfetiva`; `PATCH /api/minhas-rotas/entregas/:id/insucesso` grava
`status: NAO_ENTREGUE` com `motivoInsucesso`, `observacao` e a `dataEfetiva` da
tentativa. `NAO_ENTREGUE` é diferente de `CANCELADA` — cancelada é o pedido que
nunca saiu; não entregue é a tentativa feita e frustrada, que o gestor depois
reatribui, reagenda ou cancela. Uma entrega `NAO_ENTREGUE` ainda aceita
conclusão, porque o motorista pode voltar ao endereço no mesmo dia.

A posse da entrega é conferida no service nas duas rotas, não só pelo perfil da
rota HTTP — o id vem da requisição, então sem essa checagem um motorista mexeria
na entrega de outro só trocando o id.

Ao reatribuir uma rota a outro motorista (`PUT /api/rotas/:id` com um `motoristaId`
diferente), as entregas da rota são movidas junto, na mesma transação:
`Entrega.motoristaId` é independente do da `Rota`, e se ficasse para trás o motorista
antigo continuaria vendo essas entregas como dele.

## Endpoints principais

| Recurso | Rotas |
|---|---|
| Motoristas | `GET/POST /api/motoristas`, `GET/PUT/DELETE /api/motoristas/:id`, `POST /api/motoristas/:id/acesso` (só `GESTOR`) |
| Minhas rotas (motorista) | `GET /api/minhas-rotas`, `PATCH /api/minhas-rotas/entregas/:id/concluir` (só `MOTORISTA`) |
| Veículos | `GET/POST /api/veiculos`, `GET/PUT/DELETE /api/veiculos/:id` |
| Rotas | `GET/POST /api/rotas`, `GET/PUT/DELETE /api/rotas/:id` |
| Entregas | `GET/POST /api/entregas`, `GET/PUT/DELETE /api/entregas/:id` |
| Dashboard | `GET /api/dashboard/resumo` |
| Relatórios | `GET /api/relatorios?dataInicio=...&dataFim=...` |
| Otimização de rotas | `POST /api/otimizacao-rotas/otimizar` |
| Pedidos | `GET /api/pedidos?disponivel=true`, `POST /api/pedidos/gerar` |
| Planos | `GET/POST /api/planos`, `GET/PUT/DELETE /api/planos/:id`, `POST /api/planos/:id/otimizar`, `PATCH /api/planos/:id/pedidos/rota`, `POST /api/planos/:id/rotas/:rotaIndex/aprovar` |

`POST /api/otimizacao-rotas/otimizar` recebe `{ origem: {lat,lng}, pedidos: [{id,lat,lng,endereco?}] }`
(1 a 50 pedidos) e devolve a melhor ordem de visita (trajeto só de ida, sem voltar à
origem). Não persiste nada — é só cálculo, em memória, a cada chamada. A ordem é
decidida por uma heurística local (sem serviço externo): nearest-neighbor para a
construção inicial, seguido de uma melhoria 2-opt, sobre distância em linha reta
(haversine) entre as coordenadas.

A resposta também inclui `rotaReal` — o traçado real pelas ruas (pontos, distância e
duração), obtido de graça via [OpenRouteService](https://openrouteservice.org/dev/#/signup)
a partir da ordem já otimizada. Precisa da variável de ambiente `ORS_API_KEY`; sem ela
(ou se a chamada falhar/expirar/atingir o limite de requisições), `rotaReal` vem `null`
e o frontend cai de volta pra desenhar a linha reta entre as paradas — a otimização em
si nunca depende desse serviço externo.

`POST /api/pedidos/gerar` cria e persiste `{ quantidade }` pedidos fictícios (endereço/
unidades/volume aleatórios, mesmos bairros de Joinville usados na Otimização de Rotas).
`POST /api/planos` recebe `{ nome, pedidoIds }` e vincula esses pedidos ao plano — rejeita
com `409` se algum já pertencer a outro plano (um pedido só pode estar em um plano por
vez). `POST /api/planos/:id/otimizar` recebe `{ tamanhoRota }` e divide os pedidos do
plano em grupos sequenciais de até esse tamanho (grava em `rotaIndex`) — é só
distribuição por tamanho, sem geometria nenhuma, diferente da Otimização de Rotas.
Excluir um plano libera os pedidos de volta (`planoId` volta a `null`), não os apaga.

`POST /api/planos/:id/rotas/:rotaIndex/aprovar` recebe `{ motoristaId, veiculoId,
dataHora }` e promove um grupo (`rotaIndex`) já otimizado a uma `Rota` de verdade: gera
um código sequencial `RT-XXX`, marca os pedidos do grupo como aprovados (`Pedido.rotaId`)
e cria uma `Entrega` real por pedido, vinculada a essa rota — a partir daí a rota aparece
na listagem real de `/api/rotas` e entra nos agregados de Dashboard/Relatórios, igual a
qualquer rota cadastrada manualmente. Rejeita com `409` se o grupo já tiver sido aprovado
antes (idempotência) e com `422` se o plano ainda não tiver sido otimizado. Como
consequência, `prisma/seed.js` não semeia mais rotas/entregas fictícias — a página de
Rotas só mostra o que foi de fato aprovado a partir de um plano.

Os endpoints de listagem (`GET /api/motoristas`, `/veiculos`, `/rotas`, `/entregas`) aceitam
paginação via `?page=1&pageSize=10` (`pageSize` máximo 100) e retornam
`{ items, pagination: { page, pageSize, total, totalPages } }`. Motoristas e veículos também
aceitam `?emRota=true|false` para filtrar por quem tem rota `ATIVA` vinculada no momento.

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

## Como o front-end consome esta API

O front-end (`controlog-frontend`) consome estes endpoints de verdade — não há dados
mockados fora dos testes. O cliente HTTP é um único `axios` em
`src/lib/api.ts`, com `baseURL` vindo de `VITE_API_URL`:

1. Um interceptor de request anexa `Authorization: Bearer <accessToken>` em toda
   chamada, lendo o token do store de autenticação (Zustand).
2. Um interceptor de response trata `401` chamando `/api/auth/refresh` uma única vez
   por falha (as chamadas concorrentes compartilham a mesma promessa de refresh, pra
   não disparar vários refreshes em paralelo) e repete a requisição original com o
   token novo. Se o refresh também falhar, faz logout.
3. Os enums são iguais nas duas pontas, em maiúsculas (`ATIVA`, `PENDENTE`,
   `GESTOR`...) — não há conversão de caixa no meio do caminho.

As respostas paginadas (`{ items, pagination }`) têm um tipo compartilhado
`PaginatedResponse<T>` no mesmo arquivo.
