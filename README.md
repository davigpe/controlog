# 🚚 Controlog

[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=davigpe_controlog&metric=alert_status)](https://sonarcloud.io/project/overview?id=davigpe_controlog)
[![Cobertura](https://sonarcloud.io/api/project_badges/measure?project=davigpe_controlog&metric=coverage)](https://sonarcloud.io/component_measures?id=davigpe_controlog&metric=coverage)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=davigpe_controlog&metric=code_smells)](https://sonarcloud.io/project/issues?id=davigpe_controlog&types=CODE_SMELL)
[![Dívida técnica](https://sonarcloud.io/api/project_badges/measure?project=davigpe_controlog&metric=sqale_index)](https://sonarcloud.io/component_measures?id=davigpe_controlog&metric=sqale_index)

Sistema de gestão logística para pequenas e médias empresas de transporte, com controle centralizado de rotas, motoristas, veículos e entregas.

Este é o repositório do projeto de portfólio desenvolvido para a disciplina de Engenharia de Software (Católica SC). A especificação completa — contexto, personas, requisitos funcionais/não funcionais, regras de negócio e arquitetura — está no RFC do projeto.

**🌐 Em produção:** [controlog-frontend.vercel.app](https://controlog-frontend.vercel.app) — login de teste `gestor@controlog.com` / `controlog123`.

---

## 📌 Sobre o projeto

O Controlog substitui o controle de rotas e entregas feito hoje em planilhas e WhatsApp por uma plataforma web única, permitindo:

* Cadastro e acompanhamento de rotas, motoristas e veículos
* Carteira de clientes com endereço real: cada cliente tem um código identificador (CLI-XXX) e uma coordenada cadastrada uma vez. A base de demonstração traz 200 clientes, 10 em cada um de 20 bairros de Joinville, com endereços extraídos do OpenStreetMap — 17 km de extensão norte-sul (ver [docs/DADOS_DE_DEMONSTRACAO.md](docs/DADOS_DE_DEMONSTRACAO.md)). Os pedidos nascem no endereço do cliente em vez de num ponto sorteado, então o endereço escrito corresponde ao ponto no mapa — e vários pedidos do mesmo cliente caem exatamente no mesmo lugar
* Mapa com contador por ponto: quando o mesmo endereço concentra mais de um pedido (o cliente comprou vários itens), o marcador mostra quantos são e o balão lista cada pedido, em vez de empilhar pinos invisíveis um sobre o outro
* Central de ajuda com perguntas frequentes filtradas por perfil, respondidas pelas regras que o sistema de fato aplica
* Gestão do ciclo de vida das entregas (pendente → em trânsito → entregue/cancelada)
* Dashboard com indicadores operacionais em tempo real
* Relatórios filtráveis por período, com motoristas mais ativos e distribuição por status
* Visualização de rotas em mapa interativo (origem/destino)
* Otimização de rotas: calcula a melhor ordem de entrega de cada rota (vizinho mais próximo com melhoria 2-opt) e desenha o traçado real pelas ruas via OpenRouteService, com estimativa em linha reta tracejada quando o serviço não responde. É usada pelo fluxo de Planos; a tela de simulação isolada que existia para experimentar o algoritmo saiu do menu — o caminho de uso é gerar os pedidos e montar um plano
* Acesso de motorista: o gestor cria o login de um motorista já cadastrado, e quem entra com esse perfil vê apenas uma tela — "Minhas Rotas" —, com as rotas atribuídas a ele e as entregas de cada uma (separação aplicada no backend por perfil, não só escondida na interface)
* Recuperação de senha por e-mail: o link de redefinição chega na caixa de entrada, enviado pelo Amazon SES com DKIM e SPF alinhados ao domínio. Sem chave de API no servidor — a permissão vem do instance profile da instância
* Comprovante de entrega: antes de concluir, o motorista anexa a foto do canhoto ou do volume no destino, direto da câmera do celular. A conclusão fica bloqueada até haver pelo menos um anexo, e a regra vale no backend, não só no botão. A imagem é reduzida no aparelho antes de subir, para não depender de conexão boa na rua
* Interface adaptada a celular: a navegação vira uma gaveta, os formulários empilham e os alvos de toque crescem — a tela do motorista é usada em pé, na rua, com uma mão
* Atribuição de rotas: tela de gestão com as rotas aprovadas, quantas entregas cada uma tem (e quantas seguem pendentes), quem é o responsável atual e a carga da equipe — trocar o motorista de uma rota leva as entregas dela junto
* Aprovação sem vínculos definidos: a rota pode ser aprovada antes de se saber quem dirige e em que veículo, e a definição acontece depois na tela de Atribuição. O veículo aceita três respostas — um da frota, "veículo próprio" (o motorista usa o dele, e o trajeto não consome a frota) ou nenhum ainda
* Planejamento de pedidos: gera pedidos fictícios persistidos, seleciona vários de uma vez pra montar um plano nomeado, divide os pedidos do plano em rotas automaticamente por um tamanho máximo informado e exibe cada rota otimizada num mapa com o traçado real pelas ruas (mesma integração com a OpenRouteService); o agrupamento automático pode ser ajustado à mão desenhando um polígono no mapa — a seleção vira uma rota nova, é movida para outra rota ou é desatribuída —, e cada rota pode ser aprovada a critério do usuário, virando uma Rota real (com código sequencial RT-XXX) e uma Entrega por pedido, aparecendo na página de Rotas junto de Dashboard/Relatórios

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
│   ├── ARQUITETURA.md              # diagramas C4: contexto, contêineres, componentes
│   ├── REQUISITOS.md               # requisitos funcionais, regras de negócio, casos de uso
│   ├── PLANO_DE_TESTES.md          # plano de testes e casos de teste principais
│   ├── SEGURANCA.md                # análise estática, SAST e auditoria de dependências
│   ├── OBSERVABILIDADE.md          # alarmes, painel e log no CloudWatch
│   ├── AUDITORIA_ACESSIBILIDADE.md # auditoria WCAG 2.1 AA (RNF06)
│   ├── DADOS_DE_DEMONSTRACAO.md    # origem da base de clientes de exemplo
│   ├── DEPLOY_AWS.md               # deploy em vigor: EC2 + RDS, CI/CD por SSM
│   ├── DEPLOY.md                   # histórico: arquitetura anterior (Vercel + Neon)
│   └── ROADMAP.md                  # funcionalidades previstas
├── infra/
│   ├── cicd.yml           # CloudFormation: OIDC, role de deploy, perfil da instância
│   ├── email.yml          # CloudFormation: identidade SES, DKIM, MAIL FROM
│   ├── observabilidade.yml  # CloudFormation: alarmes, painel, log, health check
│   └── systemd/           # timers da instância: métricas e sincronia da senha do banco
├── scripts/
│   ├── dev.mjs            # sobe banco, API e interface com um comando só
│   ├── deploy-instancia.sh  # executado na instância pelo CI: build, sobe, verifica
│   ├── metricas-instancia.sh  # memória, swap e disco no CloudWatch (timer do systemd)
│   └── sincronizar-senha-do-banco.sh  # acompanha a rotação da senha mestra do RDS
├── Caddyfile                # TLS automático, HSTS, redireciona www para o apex
├── docker-compose.https.yml # sobreposição que põe o Caddy na frente do nginx
├── docker-compose.logs.yml  # sobreposição opcional: log da API no CloudWatch
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

Veja [`docs/PLANO_DE_TESTES.md`](docs/PLANO_DE_TESTES.md) para a lista de casos de teste por funcionalidade e regra de negócio, e [`docs/TESTES_CAIXA_BRANCA.md`](docs/TESTES_CAIXA_BRANCA.md) para os testes de caixa branca: critérios de cobertura, grafo de fluxo, complexidade ciclomática e caminhos independentes das regras de negócio.

---

## 🔒 Análise estática e segurança

Quatro camadas, todas no CI, nenhuma dependendo de serviço externo:

| Camada | Ferramenta | O que pega |
|---|---|---|
| Lint do backend | ESLint + `eslint-plugin-security` | Erro de código e padrão inseguro em Node |
| Lint do frontend | ESLint + `typescript-eslint` | Erro de código e uso incorreto de *hooks* |
| SAST | CodeQL | Injeção, XSS e travessia de caminho, seguindo o dado da entrada até o uso |
| Dependências | `npm audit`, `dependency-review-action`, Dependabot | Vulnerabilidade conhecida em pacote de terceiro |

```bash
cd controlog-backend && npm run lint && npm audit
cd controlog-frontend && npm run lint && npm audit
```

Os achados do CodeQL ficam em *Security → Code scanning*. O que foi
conscientemente aceito, com o motivo e a exposição real de cada caso, está em
[`docs/SEGURANCA.md`](docs/SEGURANCA.md) — inclusive as duas migrações de major
ainda pendentes.

---

## 📊 Observabilidade

CloudWatch: nove alarmes, um painel, log da API consultável no Logs Insights e
verificação externa de `/health` pelo Route 53, tudo em
[`infra/observabilidade.yml`](infra/observabilidade.yml).

O alarme que mais importa é o de **memória**: a instância tem 913 MiB, e o build
do frontend já foi morto por falta dela ali dentro. É também por isso que o
monitoramento é CloudWatch e não Prometheus com Grafana — dois serviços
residentes competiriam pela memória que falta, e o monitoramento cairia junto com
o que deveria observar.

Memória, swap e disco não são métricas nativas da EC2: vêm de
[`scripts/metricas-instancia.sh`](scripts/metricas-instancia.sh), disparado por um
timer do systemd — mais leve do que o agente do CloudWatch pelo mesmo motivo, e
sem processo parado ocupando memória entre as execuções.

A verificação externa aponta para **`/health/db`**, não para `/health`: o
primeiro consulta o banco, o segundo só prova que o processo subiu. A diferença
não é teórica — a rotação automática da senha do RDS já deixou todo login
respondendo 500 por cinco horas com o `/health` devolvendo 200 o tempo inteiro.
Por isso também existe [`scripts/sincronizar-senha-do-banco.sh`](scripts/sincronizar-senha-do-banco.sh),
que acompanha a rotação e recria a API quando a senha muda.

Como subir, como verificar e o custo de cada item em
[`docs/OBSERVABILIDADE.md`](docs/OBSERVABILIDADE.md).

---

## ♿ Acessibilidade

A interface foi auditada contra WCAG 2.1 nível AA (RNF06) com `axe-core` — tanto numa
auditoria completa em navegador real (incluindo contraste de cor) quanto numa suíte de
regressão automatizada que roda junto dos testes do frontend. Resultado: zero
violações nas 13 telas/estados auditados. Detalhes, metodologia e o que ficou fora do
escopo em [`docs/AUDITORIA_ACESSIBILIDADE.md`](docs/AUDITORIA_ACESSIBILIDADE.md).

---

## 🚀 Deploy

O sistema está no ar em **<https://controlog.app>**, em infraestrutura própria na
**AWS**: uma instância EC2 `t3.micro` roda Caddy, nginx e a API como contêineres
Docker, e o banco é um **RDS PostgreSQL** na mesma VPC. O site e a API ficam atrás
do mesmo domínio, então não há CORS a configurar nem URL de API embutida no build.

O Caddy termina o TLS e renova o certificado Let's Encrypt sozinho. Os
comprovantes de entrega ficam em volume Docker, fora da imagem, que é recriada a
cada deploy.

### CI/CD

Todo `push` ou PR para `main` roda lint e os testes de backend e frontend via
GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). Passando,
o deploy é automático — e **não usa SSH**:

1. O *runner* assume uma role da AWS por **OIDC**; não existe chave de acesso
   guardada no GitHub.
2. O comando chega à instância por **AWS Systems Manager**, sem abrir porta
   nenhuma.
3. A instância constrói as imagens, sobe os contêineres, espera `api` e `web`
   ficarem saudáveis e confere `/health` pela porta pública antes de declarar
   sucesso.

As migrations rodam **antes** de a API passar a escutar a porta: migration que
falha é contêiner que nunca fica saudável, logo deploy reprovado.

Provisionamento, variáveis de ambiente, custos e o procedimento manual de
contingência em [`docs/DEPLOY_AWS.md`](docs/DEPLOY_AWS.md). Os diagramas de
arquitetura estão em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

### Para rodar a pilha de produção localmente

```bash
cp .env.production.example .env.production   # preencher
npm run prod:up                              # constrói e sobe a pilha
```

### Histórico

O projeto esteve publicado na **Vercel + Neon** até a migração para a AWS. A
disciplina passou a não aceitar hospedagem em plataformas otimizadas para
frontend estático (Vercel, Netlify, Firebase, Render), e assumir a infraestrutura
foi o caminho para atender à exigência. O registro da arquitetura anterior está
preservado em [`docs/DEPLOY.md`](docs/DEPLOY.md).

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
