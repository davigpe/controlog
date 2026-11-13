# 🚚 Controlog

Sistema de gestão logística para pequenas e médias empresas de transporte, com controle centralizado de rotas, motoristas, veículos e entregas.

Este é o repositório do projeto de portfólio desenvolvido para a disciplina de Engenharia de Software (Católica SC). A especificação completa — contexto, personas, requisitos funcionais/não funcionais, regras de negócio e arquitetura — está no RFC do projeto.

**🌐 Em produção:** [controlog-frontend.vercel.app](https://controlog-frontend.vercel.app) — login de teste `gestor@controlog.com` / `controlog123`.

---

## 📌 Sobre o projeto

O Controlog substitui o controle de rotas e entregas feito hoje em planilhas e WhatsApp por uma plataforma web única, permitindo:

* Cadastro e acompanhamento de rotas, motoristas e veículos
* Gestão do ciclo de vida das entregas (pendente → em trânsito → entregue/cancelada)
* Dashboard com indicadores operacionais em tempo real
* Relatórios filtráveis por período, com motoristas mais ativos e distribuição por status
* Visualização de rotas em mapa interativo (origem/destino)
* Simulador de otimização de rotas: gera pedidos fictícios, permite selecioná-los por polígono desenhado no mapa e organizá-los em múltiplas rotas (cada uma com cor, veículo e status próprios), calcula a melhor ordem de entrega de cada rota e desenha o traçado real pelas ruas (via OpenRouteService, com fallback em linha reta)
* Acesso de motorista: o gestor cria o login de um motorista já cadastrado, e quem entra com esse perfil vê apenas uma tela — "Minhas Rotas" —, com as rotas atribuídas a ele e as entregas de cada uma (separação aplicada no backend por perfil, não só escondida na interface)
* Recuperação de senha por e-mail: o link de redefinição chega na caixa de entrada, enviado pelo Amazon SES com DKIM e SPF alinhados ao domínio. Sem chave de API no servidor — a permissão vem do instance profile da instância
* Comprovante de entrega: antes de concluir, o motorista anexa a foto do canhoto ou do volume no destino, direto da câmera do celular. A conclusão fica bloqueada até haver pelo menos um anexo, e a regra vale no backend, não só no botão. A imagem é reduzida no aparelho antes de subir, para não depender de conexão boa na rua
* Interface adaptada a celular: a navegação vira uma gaveta, os formulários empilham e os alvos de toque crescem — a tela do motorista é usada em pé, na rua, com uma mão
* Atribuição de rotas: tela de gestão com as rotas aprovadas, quantas entregas cada uma tem (e quantas seguem pendentes), quem é o responsável atual e a carga da equipe — trocar o motorista de uma rota leva as entregas dela junto
* Aprovação sem vínculos definidos: a rota pode ser aprovada antes de se saber quem dirige e em que veículo, e a definição acontece depois na tela de Atribuição. O veículo aceita três respostas — um da frota, "veículo próprio" (o motorista usa o dele, e o trajeto não consome a frota) ou nenhum ainda
* Planejamento de pedidos: gera pedidos fictícios persistidos, seleciona vários de uma vez pra montar um plano nomeado, divide os pedidos do plano em rotas automaticamente por um tamanho máximo informado e exibe cada rota otimizada num mapa com o traçado real pelas ruas (mesma integração com a OpenRouteService da Otimização de Rotas); o agrupamento automático pode ser ajustado à mão desenhando um polígono no mapa — a seleção vira uma rota nova, é movida para outra rota ou é desatribuída —, e cada rota pode ser aprovada a critério do usuário, virando uma Rota real (com código sequencial RT-XXX) e uma Entrega por pedido, aparecendo na página de Rotas junto de Dashboard/Relatórios

---

## 🛠️ Stack tecnológica

| Camada | Tecnologias |
|---|---|
| Frontend | React 19 + TypeScript, Vite, TailwindCSS, shadcn/ui, TanStack Query, React Hook Form + Zod, Zustand, Leaflet, Recharts |
| Backend | Node.js + Express, Prisma ORM, PostgreSQL, JWT (access + refresh token), bcrypt, Zod |
| Testes | Jest + Supertest (backend) · Vitest + Testing Library (frontend) |
| Infra local | Docker Compose (PostgreSQL) |

---

## 📁 Estrutura do repositório

```
controlog/
├── controlog-backend/     # API REST (Node.js + Express + Prisma + PostgreSQL)
│   ├── prisma/             # schema, migrations e seed
│   ├── src/
│   │   ├── routes/         # definição das rotas HTTP
│   │   ├── controllers/    # adaptam request/response aos services
│   │   ├── services/       # regras de negócio (RN01–RN08)
│   │   ├── middlewares/    # auth (JWT), validação, tratamento de erros
│   │   └── validators/     # schemas Zod de entrada
│   ├── tests/               # testes unitários (Jest)
│   └── README.md            # setup detalhado do backend
├── controlog-frontend/    # SPA (React + TypeScript + Vite)
│   └── src/
│       ├── pages/           # um módulo por tela (Rotas, Rotas do Dia, Motoristas, Veículos, Entregas, Pedidos, Planos, Dashboard, Relatórios, Login)
│       ├── components/      # layout, UI (shadcn) e componentes compartilhados
│       ├── stores/          # estado de autenticação (Zustand)
│       └── lib/             # cliente HTTP (Axios) e utilitários
├── docs/
│   ├── PLANO_DE_TESTES.md          # plano de testes e casos de teste principais
│   ├── AUDITORIA_ACESSIBILIDADE.md # auditoria WCAG 2.1 AA (RNF06)
│   ├── DEPLOY.md                   # arquitetura de deploy atual (Vercel + Neon)
│   └── DEPLOY_AWS.md               # migração para AWS: EC2 + RDS, passo a passo
├── scripts/
│   └── dev.mjs            # sobe banco, API e interface com um comando só
├── docker-compose.prod.yml  # pilha de produção: nginx + API (+ Postgres opcional)
├── .env.production.example  # modelo das variáveis de produção
├── package.json           # scripts da raiz (sem dependências próprias)
└── README.md
```

---

## ⚙️ Como rodar o projeto localmente

### Pré-requisitos

* Node.js 22.12+
* Docker Desktop (para o PostgreSQL local)

### Um comando só

Na raiz do repositório:

```bash
npm run dev
```

Isso cuida de tudo: cria os `.env` a partir dos `.env.example` se faltarem, instala as
dependências das duas pastas na primeira vez, sobe o PostgreSQL pelo Docker Compose,
aplica as migrations pendentes e então levanta a API e a interface juntas, com a saída
de cada uma marcada por `[api]` e `[web]`. `Ctrl+C` derruba as duas.

* API — <http://localhost:3333>
* Interface — <http://localhost:5173>

A raiz não tem dependências próprias: o script é Node puro, então não existe
`npm install` para rodar antes.

Logins criados pelo seed (senha `controlog123` nos dois):
`gestor@controlog.com` (perfil `GESTOR`, acesso completo) e `motorista@controlog.com`
(perfil `MOTORISTA`, só a tela "Minhas Rotas"). Na primeira execução, popule o banco com
`npm run db:seed`.

### Outros scripts da raiz

| Comando | O que faz |
|---|---|
| `npm run dev` | Banco + API + interface, tudo junto |
| `npm run dev:sem-banco` | Idem, sem mexer no Docker nem nas migrations (para quem já tem um PostgreSQL próprio de pé) |
| `npm run dev:api` / `npm run dev:web` | Só uma das duas pontas |
| `npm run db:up` / `npm run db:down` | Sobe e derruba o PostgreSQL do Docker Compose |
| `npm run db:seed` | Popula o banco com os dados de exemplo |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm test` | Roda as suítes do backend e do frontend |
| `npm run build` | Build de produção do frontend |

### Passo a passo, se preferir controlar cada etapa

<details>
<summary>Subir banco, backend e frontend separadamente</summary>

```bash
# 1. Banco de dados
cd controlog-backend
cp .env.example .env
docker compose up -d

# 2. Backend — http://localhost:3333
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev

# 3. Frontend — http://localhost:5173 (em outro terminal)
cd ../controlog-frontend
npm install
npm run dev
```

</details>

Detalhes completos (variáveis de ambiente, endpoints, regras de negócio implementadas) em
[`controlog-backend/README.md`](controlog-backend/README.md).

---

## ✅ Testes

Backend e frontend têm cobertura de testes automatizados acima da meta de 70% definida no RFC (RNF07):

```bash
# Backend — Jest + Supertest (Prisma Client mockado, não precisa do banco rodando)
cd controlog-backend
npm test
npm run test:coverage

# Frontend — Vitest + Testing Library (API mockada, não precisa do backend rodando)
cd controlog-frontend
npm test
npm run test:coverage
```

Veja [`docs/PLANO_DE_TESTES.md`](docs/PLANO_DE_TESTES.md) para a lista de casos de teste por funcionalidade e regra de negócio.

---

## ♿ Acessibilidade

A interface foi auditada contra WCAG 2.1 nível AA (RNF06) com `axe-core` — tanto numa
auditoria completa em navegador real (incluindo contraste de cor) quanto numa suíte de
regressão automatizada que roda junto dos testes do frontend. Resultado: zero
violações nas 13 telas/estados auditados. Detalhes, metodologia e o que ficou fora do
escopo em [`docs/AUDITORIA_ACESSIBILIDADE.md`](docs/AUDITORIA_ACESSIBILIDADE.md).

---

## 🚀 Deploy

O projeto está publicado na **Vercel** — frontend e backend como dois projetos
separados (o backend roda como Serverless Function, embrulhando o mesmo Express de
sempre), com o banco PostgreSQL no **Neon**. Migrations rodam automaticamente a cada
build do backend.

> Nota: a partir de 2026-02 a disciplina passou a não aceitar hospedagem em
> plataformas otimizadas só para frontend estático (Vercel/Netlify/Firebase/Render) —
> essa restrição formalmente continua valendo; a migração para Vercel foi uma decisão
> consciente do autor do projeto.

CI/CD: todo `push`/PR para `main` roda os testes de backend e frontend via GitHub
Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)); os dois projetos na
Vercel estão conectados ao repositório e fazem deploy automático quando sua respectiva
pasta muda em `main`. Detalhes completos, variáveis de ambiente e passo a passo para
reproduzir em [`docs/DEPLOY.md`](docs/DEPLOY.md).

### Migração para a AWS (preparada, ainda não provisionada)

O repositório já traz o necessário para rodar em infraestrutura própria: imagens
Docker do backend e do frontend, um nginx que serve o site e encaminha `/api` para a
API, e o `docker-compose.prod.yml` que amarra os dois. Nessa arquitetura o site e a
API têm a mesma origem, o que elimina o CORS e a URL de API embutida no build — as
duas limitações registradas no deploy atual.

```bash
cp .env.production.example .env.production   # preencher
npm run prod:up                              # constrói e sobe a pilha
```

Passo a passo de EC2 + RDS, custos e alternativas avaliadas em
[`docs/DEPLOY_AWS.md`](docs/DEPLOY_AWS.md). A Vercel continua no ar até a AWS estar
funcionando.

---

## 👥 Colaboração

O repositório segue o modelo **Git Flow**:

| Branch | Propósito |
|---|---|
| `main` | Produção — só recebe merge de `release/*` ou `hotfix/*`. Dispara o deploy automático (Vercel). |
| `develop` | Integração — base para novas features, sempre com o estado mais recente pronto para o próximo release. |
| `feature/nome-da-feature` | Uma funcionalidade em desenvolvimento, criada a partir de `develop`, mesclada de volta nela. |
| `release/x.y.z` | Estabilização de uma versão antes de publicar — criada a partir de `develop`, mesclada em `main` **e** `develop`. |
| `hotfix/nome-do-fix` | Correção urgente em produção — criada a partir de `main`, mesclada em `main` **e** `develop`. |

Fluxo típico para uma nova funcionalidade:

```bash
git checkout develop
git pull
git checkout -b feature/minha-feature
# ...commits seguindo Conventional Commits (feat:, fix:, docs:, refactor:, test:)...
git push -u origin feature/minha-feature
# Abrir Pull Request de feature/minha-feature → develop
```

O repositório usa a extensão [git-flow (AVH Edition)](https://github.com/petervanderdoes/gitflow-avh); depois de instalada, os comandos `git flow feature start/finish`, `git flow release start/finish` e `git flow hotfix start/finish` automatizam esse fluxo.

---

## 🔭 Próximos passos

Funcionalidades e melhorias planejadas — veja [docs/ROADMAP.md](docs/ROADMAP.md).

---

## 📄 Licença

Este projeto está sob a licença MIT — veja [LICENSE](LICENSE).
