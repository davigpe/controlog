# 🚚 Controlog

Sistema de gestão logística para pequenas e médias empresas de transporte, com controle centralizado de rotas, motoristas, veículos e entregas.

Este é o repositório do projeto de portfólio desenvolvido para a disciplina de Engenharia de Software (Católica SC). A especificação completa — contexto, personas, requisitos funcionais/não funcionais, regras de negócio e arquitetura — está no RFC do projeto.

**🌐 Em produção:** [controlog-frontend-production.up.railway.app](https://controlog-frontend-production.up.railway.app) — login de teste `gestor@controlog.com` / `controlog123`.

---

## 📌 Sobre o projeto

O Controlog substitui o controle de rotas e entregas feito hoje em planilhas e WhatsApp por uma plataforma web única, permitindo:

* Cadastro e acompanhamento de rotas, motoristas e veículos
* Gestão do ciclo de vida das entregas (pendente → em trânsito → entregue/cancelada)
* Dashboard com indicadores operacionais em tempo real
* Relatórios filtráveis por período, com motoristas mais ativos e distribuição por status
* Visualização de rotas em mapa interativo (origem/destino)

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
│       ├── pages/           # um módulo por entidade (Rotas, Motoristas, Veículos, Entregas, Dashboard, Relatórios, Login)
│       ├── components/      # layout, UI (shadcn) e componentes compartilhados
│       ├── stores/          # estado de autenticação (Zustand)
│       └── lib/             # cliente HTTP (Axios) e utilitários
├── docs/
│   ├── PLANO_DE_TESTES.md          # plano de testes e casos de teste principais
│   ├── AUDITORIA_ACESSIBILIDADE.md # auditoria WCAG 2.1 AA (RNF06)
│   └── DEPLOY.md                   # arquitetura de deploy, URLs e como reproduzir
└── README.md
```

---

## ⚙️ Como rodar o projeto localmente

O projeto tem duas partes que rodam separadamente: a API (`controlog-backend`) e a interface web (`controlog-frontend`). Ambas precisam estar de pé ao mesmo tempo.

### Pré-requisitos

* Node.js 20+
* Docker Desktop (para o PostgreSQL local)

### 1. Banco de dados

```bash
cd controlog-backend
cp .env.example .env
docker compose up -d
```

### 2. Backend

```bash
cd controlog-backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed   # cria dados de exemplo e um usuário gestor de teste
npm run dev           # http://localhost:3333
```

Login de teste criado pelo seed: `gestor@controlog.com` / `controlog123`.

Detalhes completos (variáveis de ambiente, endpoints, regras de negócio implementadas) em [`controlog-backend/README.md`](controlog-backend/README.md).

### 3. Frontend

```bash
cd controlog-frontend
npm install
npm run dev            # http://localhost:5173
```

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

O projeto está publicado no **Railway** — frontend, backend e PostgreSQL rodando como
três serviços no mesmo projeto (não usamos Vercel/Netlify/Firebase/Render, plataformas
otimizadas só para frontend estático e fora de escopo para este trabalho a partir de
2026-02). Migrations rodam automaticamente a cada deploy do backend.

CI/CD: todo `push`/PR para `main` roda os testes de backend e frontend via GitHub
Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)); cada serviço no
Railway está conectado ao repositório e faz deploy automático quando sua respectiva
pasta muda em `main`. Detalhes completos, variáveis de ambiente e passo a passo para
reproduzir em [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## 👥 Colaboração

1. Crie uma branch: `git checkout -b minha-feature`
2. Faça commits seguindo Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
3. Envie para o repositório: `git push origin minha-feature`
4. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT — veja [LICENSE](LICENSE).
