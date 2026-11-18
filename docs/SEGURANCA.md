# Análise estática e segurança — Controlog

O que roda, o que cada ferramenta cobre, e o que foi conscientemente aceito.

## 1. As cinco camadas

| Camada | Ferramenta | Onde roda | O que pega |
|---|---|---|---|
| Lint do backend | ESLint 10 + `eslint-plugin-security` | CI, a cada *push* e PR | Erro de código e padrão inseguro em Node |
| Lint do frontend | ESLint 10 + `typescript-eslint` + regras do React | CI, a cada *push* e PR | Erro de código e uso incorreto de *hooks* |
| SAST | CodeQL (`javascript-typescript`) | CI, a cada *push*, PR e semanalmente | Falha que depende de seguir o dado da entrada até o uso: injeção, XSS, travessia de caminho |
| Qualidade e métricas | SonarCloud | CI, a cada *push* e PR, depois dos testes | Cobertura, *code smells*, duplicação, complexidade e dívida técnica, com *quality gate* |
| Dependências | `npm audit` + `dependency-review-action` + Dependabot | CI e semanalmente | Vulnerabilidade conhecida em pacote de terceiro |

### CodeQL e SonarCloud: papéis diferentes

As diretrizes do portfólio citam SonarQube, SonarCloud e CodeClimate como
exemplos. O CodeQL já fazia a análise estática de segurança, com os achados na
aba *Security* do GitHub, junto dos alertas de dependência. O que faltava era a
**métrica**: o ESLint aprova ou reprova, mas não diz quanto código está coberto,
quanto está duplicado nem quanta dívida técnica acumulou. Esse é o papel do
SonarCloud.

- **Painel:** [sonarcloud.io/project/overview?id=davigpe_controlog](https://sonarcloud.io/project/overview?id=davigpe_controlog),
  com os *badges* no topo do README.
- **Configuração:** [`sonar-project.properties`](../sonar-project.properties),
  na raiz. Os recortes de cobertura são os mesmos do Jest e do Vitest, para o
  número do painel bater com o do `npm run test:coverage`.
- **Cobertura:** os jobs `backend` e `frontend` do CI rodam
  `npm run test:coverage`, o que também faz o mínimo de 70% (RNF07) reprovar o
  CI, e entregam o `lcov.info` ao job `sonar`.
- **Análise pelo CI, não automática:** a análise automática do SonarCloud está
  desligada, porque ela não recebe a cobertura. O *token* fica no *secret*
  `SONAR_TOKEN` do repositório.
- **Não bloqueia o deploy:** o *quality gate* aparece no painel e no PR, mas o
  deploy depende só de lint, testes e auditoria.

## 2. O lint do backend

Entrou junto desta análise; antes havia ESLint só no frontend. A configuração
está em `controlog-backend/eslint.config.js`.

As regras do `eslint-plugin-security` são **erro**, não aviso. Quando o lint
entrou havia quatro ocorrências, todas verificadas uma por uma e dispensadas no
próprio local com a justificativa — o que significa que qualquer ocorrência
**nova** reprova o CI, em vez de virar aviso que ninguém lê.

| Local | Regra | Por que foi dispensada |
|---|---|---|
| `middlewares/uploadComprovante.js` | `detect-non-literal-fs-filename` | O caminho vem de `config/comprovantes.js`, montado de variável de ambiente; nenhuma entrada de requisição o alcança |
| `services/comprovante.service.js` (2×) | `detect-non-literal-fs-filename` | `caminhoDoArquivo()` resolve o caminho e confere que o resultado está contido em `DIRETORIO_COMPROVANTES`, lançando se escapar |
| `utils/codigoSequencial.js` | `detect-non-literal-regexp` | O prefixo nunca vem de requisição: os três chamadores passam os literais `'RT-'` e `'EN-'` |

Duas regras ficaram **desligadas**, e o motivo é ruído, não discordância:

- **`security/detect-object-injection`** acusa qualquer `objeto[chave]` com chave
  variável, o que inclui todo acesso legítimo a mapa — rótulo de status, tabela
  de transporte de e-mail, extensão por *MIME type*. O risco real que ela mira,
  caminho de arquivo montado com entrada do cliente, é tratado explicitamente em
  `comprovante.service.js` e coberto por teste.
- **`require-await`** acusa toda função `async` sem `await`, e isso inclui dois
  usos corretos: implementar interface que promete devolver promessa — como o
  transporte de e-mail `registro`, que só escreve no log — e criar *mock* de
  teste. O que a regra tentava pegar, promessa criada e não aguardada, exige
  informação de tipo (`no-floating-promises`), indisponível em JavaScript puro.

## 3. Dependências

### O que foi corrigido

| | Antes | Depois |
|---|---|---|
| Backend | 16 (1 crítica, 7 altas) | **10 (0 crítica, 4 altas)** |
| Frontend | 41 (1 crítica, 20 altas) | **17 (0 crítica, 0 alta)** |

As duas críticas eram a mesma: `proxy-addr`, que chegava por caminhos de
ferramenta. As correções foram de três tipos:

1. **`npm audit fix` no backend**, que resolveu tudo o que não exigia troca de
   major.
2. **Pacotes diretos do frontend subidos dentro do próprio range**: `axios`
   1.19→1.21, `zod` 4.4→4.6, `postcss` 8.5.15→8.5.33, `vite` 8.0→8.3 e
   **`react-router-dom` 7.16→7.18.5**, este o mais relevante por ser dependência
   de execução — corrige *open redirect* via contrabarra em `<Link>` e
   `useNavigate`.
3. **Mudanças de empacotamento**, que eliminaram advisories em vez de atualizá-los:
   - `serve` **removido**. Era dependência de execução usada só por um script
     `start` que nada no repositório chamava — sobra da hospedagem anterior. Em
     produção o nginx serve o `dist`.
   - `shadcn` movido de `dependencies` para `devDependencies`. É CLI de
     *scaffold* usada em tempo de build (o `global.css` faz
     `@import "shadcn/tailwind.css"`), e em `dependencies` arrastava `hono`,
     `proxy-addr`, `body-parser` e o SDK do MCP para dentro de uma SPA.

> **`npm audit fix` não funciona no frontend.** Ele falha com
> `Cannot read properties of null (reading 'edgesOut')`, um erro interno do npm
> 10.9.0 ao percorrer esta árvore de dependências. O erro persiste depois de
> `npm ci` com `node_modules` recém-instalado, então não é árvore corrompida. O
> caminho que funciona é editar o range no `package.json` e regerar o
> `package-lock.json` com `npm install`.

Três transitivos de ferramenta de build — `brace-expansion`, `browserslist` e
`undici` — foram resolvidos com `overrides` no `package.json`, todos dentro da
mesma major.

### O que foi aceito, e por quê

Sobram **quatro advisories de severidade alta no backend**, todos sem correção
sem quebra:

| Pacote | Advisory | Por que não foi corrigido | Exposição real |
|---|---|---|---|
| `prisma`, `@prisma/config` | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) — `deepmerge-ts` exaure a pilha ao mesclar grafos recursivos | Exige `prisma` acima de 7.10.0, ou seja a major 7. É migração à parte, com mudança de esquema e de cliente | O `@prisma/config` é o carregador de configuração da **CLI**; roda em *build* e em migração, não no atendimento de requisição |
| `deepmerge-ts` | mesmo acima | Transitivo do `@prisma/config` | idem |
| `zod` | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) — exaure memória validando coleção grande com restrição de tamanho | O backend está na zod 3; a correção é a 4.6.6, e a migração reescreve todos os validadores | **Analisada em detalhe abaixo** |

As seis de severidade baixa restantes estão todas no `jest` e nos pacotes que ele
traz. O `npm audit` propõe como correção **voltar para `jest@25.1.0`** — quatro
majors atrás da 29 em uso. Não há correção para frente, e o `jest` não roda em
produção.

### A exposição do advisory do zod, medida

O advisory precisa de uma coleção com restrição de tamanho. No backend existem
duas, as duas o mesmo campo `pedidoIds`, em `plano.validators.js`.

O que limita o alcance:

- **Autenticação obrigatória.** `/api/planos` está atrás de `requireAuth` e de
  `apenasGestao` em `routes/index.js`. Não é alcançável sem sessão, e nem por
  motorista.
- **Corpo limitado a 1 MB** por `express.json({ limit: '1mb' })`.
- **Limite de requisições:** 300 por minuto por IP.

O que foi feito a respeito, sem esperar a migração: **as duas listas ganharam
teto de 500 itens** (`.max(500)`). O limite de 1 MB do corpo, sozinho, deixaria
passar cerca de 25 mil UUIDs; o teto de 500 fica muito abaixo de qualquer
amplificação, e muito acima do uso legítimo — a geração de pedidos aceita no
máximo 200 por vez. O teto é verificado em `tests/plano.validators.test.js`, que
inclui o caso de fronteira nos dois esquemas.

### Por que o portão do CI é `critical`, e não `high`

Porque sobram quatro altas sem correção disponível. Um portão em `high` ficaria
vermelho de forma permanente — e portão sempre vermelho deixa de ser lido, o que
é pior do que não ter portão. Em `critical` ele está verde hoje e volta a
reprovar no dia em que algo pior entrar.

A dívida conhecida não cresce por causa da outra metade: o
`dependency-review-action` reprova quando um **PR introduz** dependência
vulnerável nova a partir de `high`, independentemente do nível absoluto do
projeto.

## 4. Trabalho ainda pendente

| Item | Esforço | Risco |
|---|---|---|
| Migrar o backend para `zod` 4 | Reescreve todos os validadores: mensagens de erro, `z.coerce`, assinatura de `.refine` | Alto. Os 295 testes do backend cobrem os validadores, o que torna a migração verificável, mas é trabalho de uma sessão própria |
| Migrar `prisma` 6 para 7 | Mudança de cliente e de geração | Médio. Encerra os três advisories da família Prisma de uma vez |

Nenhum dos dois é `npm audit fix`. Estão registrados aqui para não parecerem
esquecimento.

## 5. Segurança da aplicação, fora das ferramentas

As decisões de segurança do próprio sistema — resposta uniforme em "esqueci
minha senha" contra enumeração de usuários, nome de arquivo de comprovante
gerado no servidor, SES por *instance profile* sem chave no servidor,
`TRUST_PROXY=2` para o limitador contar o IP certo, OIDC no deploy sem
credencial de longa duração — estão em
[ARQUITETURA.md](ARQUITETURA.md) e na seção *Decisões de projeto* da
[wiki](https://github.com/davigpe/controlog/wiki/Decisoes-de-projeto).

## Como reproduzir

```bash
# Lint
cd controlog-backend && npm run lint
cd controlog-frontend && npm run lint

# Dependências
cd controlog-backend && npm audit
cd controlog-frontend && npm audit

# Cobertura (o mesmo lcov que o CI envia ao SonarCloud)
cd controlog-backend && npm run test:coverage
cd controlog-frontend && npm run test:coverage

# CodeQL roda no CI; os achados ficam em Security > Code scanning
# SonarCloud roda no CI; o painel fica em sonarcloud.io (link na seção 1)
```
