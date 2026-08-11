# Plano de Testes — Controlog

Este documento responde ao parecer do professor Diego Sauter Possamai sobre o RFC do
projeto: detalha o plano de testes com os principais casos previstos para validar cada
funcionalidade importante, e descreve como a autenticação de usuários e os perfis de
acesso são implementados.

## 1. Autenticação e perfis de acesso

**Mecanismo.** Autenticação stateless via JWT (RNF03). O login (`POST /api/auth/login`)
retorna dois tokens:

- **Access token** — vida curta (1h), enviado em `Authorization: Bearer <token>` em toda
  requisição às rotas protegidas. Validado pelo middleware `requireAuth`
  (`controlog-backend/src/middlewares/auth.js`).
- **Refresh token** — vida longa (7 dias), usado por `POST /api/auth/refresh` para obter
  um novo access token sem exigir login novamente. O front-end faz essa troca
  automaticamente quando uma requisição volta `401` (`controlog-frontend/src/lib/api.ts`).

Senhas nunca são armazenadas em texto puro — o hash é gerado com `bcrypt` (fator de custo
12) antes de qualquer gravação no banco.

**RN01 — apenas usuários autenticados podem acessar qualquer funcionalidade do sistema.**
Aplicado de duas formas:

- No backend, o middleware `requireAuth` é montado globalmente em
  `controlog-backend/src/routes/index.js` para tudo que não seja `/api/auth/*`. Qualquer
  requisição sem token válido recebe `401` antes de chegar ao controller.
- No front-end, o componente `RequireAuth` (`controlog-frontend/src/components/auth/RequireAuth.tsx`)
  redireciona para `/login` quem tenta acessar qualquer página sem sessão ativa.

**Perfis de acesso.** O campo `perfil` do usuário assume um de três valores:

| Perfil | Descrição | Diferencial de permissão |
|---|---|---|
| `GESTOR` | Supervisiona rotas, frota e relatórios (persona Ricardo Menezes) | Único perfil autorizado a reativar uma rota Concluída/Cancelada (RN02) |
| `OPERADOR` | Cadastra e mantém rotas/entregas no dia a dia (persona Juliana Ferreira) | Acesso operacional padrão — perfil atribuído automaticamente no autocadastro |
| `MOTORISTA` | Consulta rotas e entregas atribuídas (persona Marcos Oliveira) | Reservado para uso futuro de uma visão restrita ao próprio motorista |

O autocadastro público (`POST /api/auth/register`) sempre cria um usuário `OPERADOR` —
elevar alguém a `GESTOR` é uma ação administrativa feita diretamente no banco (ou via
seed), evitando escalonamento de privilégio pela própria API pública.

## 2. Estratégia de testes

| Camada | Ferramenta | O que cobre |
|---|---|---|
| Backend — services e regras de negócio | Jest, com Prisma Client mockado (injetado via `create*Service(prisma)`) | RN01–RN08, validações, mapeamento de erros do Prisma |
| Backend — middlewares | Jest | `requireAuth`, `requireRole`, `validate`, `errorHandler` |
| Backend — integração HTTP | Jest + Supertest, app real via `createApp()` | Wiring de rotas, status codes, RN01 fim a fim |
| Backend — controllers | Jest, services mockados | Delegação correta de request/response |
| Frontend — stores, lib e helpers | Vitest, `axios` parcialmente mockado | `authStore` (login/logout/refresh), interceptors de `lib/api.ts`, `getErrorMessage`, helpers de status |
| Frontend — componentes e páginas | Vitest + Testing Library, `@/lib/api` mockado (`api.get/post/put/delete`) | Renderização com dados reais da API, formulários, confirmação de exclusão, mensagens de erro de regra de negócio |
| Frontend — acessibilidade estrutural | `vitest-axe` (mesmo motor `axe-core`), regra `color-contrast` desligada (não confiável em jsdom) | Nome acessível de botões/campos, labels de formulário, atributos ARIA válidos — ver [`docs/AUDITORIA_ACESSIBILIDADE.md`](AUDITORIA_ACESSIBILIDADE.md) |
| Frontend — fluxo completo | Playwright (execução manual/exploratória, ponta a ponta com backend e banco reais) | Login → navegação → CRUD → bloqueio de regra de negócio → logout |

**Cobertura automatizada atual:**

- **Backend:** 79 testes em 13 suítes — **94,3% statements**, **95% funções**, **71,3% branches**.
  Comando: `cd controlog-backend && npm run test:coverage`.
- **Frontend:** 77 testes em 18 suítes — **78,6% statements**, **70,2% funções**, **78,4% branches**.
  Comando: `cd controlog-frontend && npm run test:coverage`.

Ambos acima da meta de 70% definida na RNF07.

**Lacuna conhecida:** os fluxos de criação de Rota e Entrega que dependem de múltiplos
`Select` (Radix UI) encadeados têm cobertura mais leve no frontend — a interação com esses
componentes em jsdom é mais custosa de simular, então essa parte se apoia mais no roteiro
Playwright de ponta a ponta (seção 5) do que em testes unitários de componente.

## 3. Casos de teste por requisito funcional

| ID | Caso de teste | Resultado esperado | Cobertura |
|---|---|---|---|
| RF01 | Criar rota informando código, origem, destino, motorista, veículo, data/hora e status | Rota criada com status `ATIVA` por padrão | `tests/rota.service.test.js` |
| RF01/RN06 | Criar rota sem motorista ou veículo válido | Erro `ValidationError` (422), rota não é criada | `tests/rota.service.test.js` |
| RF02 | Editar dados de uma rota existente | Dados atualizados e refletidos no `GET` seguinte | `tests/rota.service.test.js` |
| RF03/RN08 | Excluir rota sem entregas pendentes vinculadas | Rota removida (204) | `tests/rota.service.test.js` |
| RF03/RN08 | Excluir rota com entrega `PENDENTE` ou `EM_TRANSITO` vinculada | Erro `ConflictError` (409), rota não é removida | `tests/rota.service.test.js` |
| RF04 | Consultar detalhes de uma rota | Retorna origem/destino e coordenadas para o mapa | `tests/rota.service.test.js` + manual (RotaDetalhes + Leaflet) |
| RF05 | Filtrar rotas por código, motorista, cidade ou veículo | Lista retorna apenas as rotas compatíveis com o termo buscado | `tests/rota.service.test.js` |
| RF06 | Alterar status da rota para Concluída/Cancelada | Status persistido | `tests/rota.service.test.js` |
| RF07 | Consultar resumo do dashboard | Retorna contagem de rotas por status, motoristas, veículos e entregas | `tests/dashboard.service.test.js` |
| RF08/RF09 | Cadastrar, editar e excluir motorista/veículo | CRUD completo funcionando | `tests/motorista.service.test.js`, `tests/veiculo.service.test.js` |
| RF10 | Exibir coordenadas de origem/destino no mapa | Marcadores e linha entre os dois pontos no Leaflet | Manual (RotaMapa.tsx) |
| RF11/RF12 | Cadastrar entrega vinculada a uma rota e a um motorista | Entrega criada com status `PENDENTE` por padrão | `tests/entrega.service.test.js` |
| RF11/RN07 | Cadastrar entrega sem rota ou motorista válido | Erro `ValidationError` (422) | `tests/entrega.service.test.js` |
| RF13/RF14 | Consultar relatório filtrado por período (`dataInicio`/`dataFim`) | Retorna rotas/entregas por status e motoristas mais ativos apenas dentro do intervalo | `tests/relatorio.service.test.js` |

## 4. Casos de teste das regras de negócio (RN01–RN08)

| Regra | Caso de teste | Resultado esperado | Cobertura |
|---|---|---|---|
| RN01 | Requisitar qualquer endpoint de `/api/*` (exceto `/auth`) sem token | `401 Unauthorized` | `tests/app.test.js` |
| RN02 | Usuário `OPERADOR` tenta reativar rota `CONCLUIDA`/`CANCELADA` | `403 Forbidden` | `tests/rota.service.test.js` |
| RN02 | Usuário `GESTOR` reativa rota `CONCLUIDA`/`CANCELADA` | Status alterado com sucesso | `tests/rota.service.test.js` |
| RN03 | Excluir motorista com rota `ATIVA` vinculada | `409 Conflict` — "Não é possível excluir um motorista com rotas ativas vinculadas (RN03)" | `tests/motorista.service.test.js` + validado manualmente no navegador (toast de erro) |
| RN04 | Excluir veículo com rota `ATIVA` vinculada | `409 Conflict` (RN04) | `tests/veiculo.service.test.js` |
| RN05 | Criar/editar rota com código já usado por outra rota | `409 Conflict` (RN05) | `tests/rota.service.test.js` |
| RN06 | Criar rota sem origem, destino, motorista ou veículo | Rejeitado na validação (Zod), 422 | `tests/rota.service.test.js` + `src/validators/rota.validators.js` |
| RN07 | Criar entrega sem rota ou motorista vinculado | `422 Unprocessable Entity` (RN07) | `tests/entrega.service.test.js` |
| RN08 | Excluir rota com entrega `PENDENTE`/`EM_TRANSITO` vinculada | `409 Conflict` (RN08) | `tests/rota.service.test.js` |

## 5. Casos de teste automatizados do frontend

| Área | Caso de teste | Arquivo |
|---|---|---|
| Autenticação | Login com sucesso armazena usuário/tokens e navega para a área protegida | `src/pages/Login/index.test.tsx` |
| Autenticação | Login com credenciais inválidas mostra erro e não navega | `src/pages/Login/index.test.tsx` |
| Autenticação | Refresh troca o access token; se o refresh token for inválido, faz logout | `src/stores/authStore.test.ts` |
| RN01 | Rota protegida redireciona para `/login` sem sessão; renderiza com sessão ativa | `src/components/auth/RequireAuth.test.tsx`, `src/App.test.tsx` |
| RN03 | Excluir motorista com rota ativa mostra a mensagem de erro do backend | `src/pages/Motoristas/index.test.tsx` |
| RN04 | Excluir veículo com rota ativa mostra a mensagem de erro do backend | `src/pages/Veiculos/index.test.tsx` |
| RN08 | Excluir rota com entregas pendentes mostra a mensagem de erro do backend | `src/pages/Rotas/index.test.tsx` |
| CRUD | Listagem, estado vazio, criação, edição e exclusão (Motoristas/Veículos/Entregas/Rotas) | `src/pages/*/index.test.tsx` |
| Dashboard | KPIs e distribuição de entregas por status a partir do resumo da API | `src/pages/Dashboard/index.test.tsx` |
| Relatórios | KPIs por período e troca de filtro de data reconsultando a API | `src/pages/Relatorios/index.test.tsx` |
| Layout | Sidebar destaca o link ativo; Header mostra usuário logado e faz logout | `src/components/layout/*.test.tsx` |

## 6. Roteiro de teste exploratório de front-end (executado)

Roteiro rodado ponta a ponta via Playwright (Chromium headless) contra o front-end e o
backend reais, apontando para o mesmo PostgreSQL de desenvolvimento:

1. Acessar `/` sem sessão → redirecionado para `/login`. ✅
2. Login com `gestor@controlog.com` / `controlog123` → redirecionado ao Dashboard com
   dados reais do banco (contagens de rotas, motoristas, veículos). ✅
3. Navegar por Rotas, Motoristas, Veículos, Entregas e Relatórios → cada página carrega
   dados reais via API, sem erros no console. ✅
4. Abrir o modal "Nova Rota" → selects de motorista/veículo populados pela API. ✅
5. Cadastrar um novo motorista → toast de sucesso, card aparece na listagem
   imediatamente (invalidação de cache do React Query). ✅
6. Tentar excluir um motorista com rota ativa vinculada → toast de erro exibindo a
   mensagem de RN03 vinda do backend; motorista não é removido. ✅
7. Excluir um motorista sem vínculos → removido com sucesso. ✅
8. Logout → sessão limpa, redirecionado para `/login`. ✅

Nenhum erro de console/rede inesperado foi observado em nenhuma etapa (apenas o `409`
esperado no passo 6).

## 7. Como rodar os testes

```bash
# Testes automatizados do backend (não precisa do banco rodando)
cd controlog-backend
npm test
npm run test:coverage   # com relatório de cobertura

# Testes automatizados do frontend (não precisa do backend rodando)
cd controlog-frontend
npm test
npm run test:coverage   # com relatório de cobertura

# Backend + banco reais, para teste manual/exploratório de ponta a ponta
cd controlog-backend && docker compose up -d && npm run dev   # terminal 1
cd controlog-frontend && npm run dev                          # terminal 2
# acessar http://localhost:5173, login gestor@controlog.com / controlog123
```
