# Arquitetura — Controlog

Este documento descreve a arquitetura do sistema nos três primeiros níveis do
modelo **C4**: contexto, contêineres e componentes.

> **Sobre a notação.** Os diagramas usam Mermaid em sintaxe `flowchart`, com as
> fronteiras do C4 representadas por `subgraph`, e não a sintaxe experimental
> `C4Context`/`C4Container`. O motivo é prático: a sintaxe experimental ainda
> produz sobreposição de caixas em vários visualizadores, incluindo o próprio
> GitHub. A semântica do C4 — pessoa, sistema, contêiner, componente, fronteira
> — está preservada nos rótulos e na legenda de cada nível.

---

## Nível 1 — Contexto

Quem usa o sistema e com quais sistemas externos ele conversa.

```mermaid
flowchart TB
    gestor["👤 Gestor<br/><i>Supervisiona operação,<br/>frota e relatórios</i>"]
    operador["👤 Operador<br/><i>Opera pedidos, rotas,<br/>entregas e clientes</i>"]
    motorista["👤 Motorista<br/><i>Executa rotas e comprova<br/>entregas pelo celular</i>"]

    controlog["<b>Controlog</b><br/><i>Sistema de gestão logística:<br/>pedidos, rotas, entregas<br/>e comprovação</i>"]

    ors["OpenRouteService<br/><i>Traçado real de rotas<br/>sobre a malha viária</i>"]
    osm["OpenStreetMap<br/><i>Imagens do mapa (tiles)</i>"]
    ses["Amazon SES<br/><i>Envio de e-mail<br/>transacional</i>"]
    acme["Let's Encrypt<br/><i>Emissão de certificado<br/>TLS via ACME</i>"]

    gestor -->|"usa, via navegador"| controlog
    operador -->|"usa, via navegador"| controlog
    motorista -->|"usa, via celular"| controlog

    controlog -->|"consulta traçado<br/>HTTPS/JSON"| ors
    controlog -->|"redefinição de senha<br/>AWS SDK"| ses
    controlog -->|"obtém e renova<br/>certificado"| acme
    motorista -.->|"carrega tiles<br/>direto do navegador"| osm
    gestor -.->|"carrega tiles"| osm
    operador -.->|"carrega tiles"| osm

    classDef pessoa fill:#08427b,stroke:#052e56,color:#fff
    classDef sistema fill:#1168bd,stroke:#0b4884,color:#fff
    classDef externo fill:#999,stroke:#6b6b6b,color:#fff
    class gestor,operador,motorista pessoa
    class controlog sistema
    class ors,osm,ses,acme externo
```

**Legenda.** Azul-escuro é pessoa; azul é o sistema em questão; cinza é sistema
externo. Linha cheia é chamada do servidor; linha tracejada é chamada feita pelo
navegador do usuário, sem passar pelo backend.

**Por que os tiles vêm direto do navegador.** As imagens do mapa são buscadas
pelo Leaflet, no cliente, sem intermediação da API. Isso evita que a instância
sirva de proxy para tráfego de imagem — que seria o maior volume de dados do
sistema e consumiria banda e CPU de uma `t3.micro` sem nenhum ganho.

---

## Nível 2 — Contêineres

As unidades executáveis e de armazenamento dentro do Controlog. Todas, exceto o
banco, rodam como contêineres Docker na **mesma instância EC2**.

```mermaid
flowchart TB
    usuario["👤 Gestor / Operador / Motorista"]

    subgraph navegador["Navegador do usuário"]
        spa["<b>SPA</b><br/><i>React 19, TypeScript, Vite</i><br/>Telas, validação de formulário,<br/>mapas e gráficos"]
    end

    subgraph ec2["Instância EC2 t3.micro — Docker Compose"]
        caddy["<b>caddy</b><br/><i>Caddy 2</i><br/>Termina TLS, renova certificado,<br/>redireciona www para o apex"]
        web["<b>web</b><br/><i>nginx</i><br/>Serve os arquivos da SPA,<br/>gzip, cache, encaminha /api"]
        api["<b>api</b><br/><i>Node 22, Express 4</i><br/>API REST, regras de negócio,<br/>autenticação e autorização"]
        comprovantes[("<b>volume de comprovantes</b><br/><i>Volume Docker</i><br/>Fotos e PDFs anexados<br/>pelos motoristas")]
    end

    subgraph aws["AWS — mesma VPC"]
        db[("<b>banco</b><br/><i>RDS PostgreSQL 16</i><br/>Clientes, pedidos, rotas,<br/>entregas, frota, usuários")]
    end

    ses["Amazon SES"]
    ors["OpenRouteService"]
    osm["OpenStreetMap"]

    usuario -->|"HTTPS"| caddy
    caddy -->|"HTTP :80"| web
    web -->|"arquivos estáticos"| spa
    web -->|"/api — HTTP"| api
    spa -->|"/api — mesma origem,<br/>JSON + JWT"| caddy
    spa -.->|"tiles"| osm

    api -->|"SQL via Prisma"| db
    api -->|"leitura e escrita<br/>de arquivo"| comprovantes
    api -->|"AWS SDK,<br/>instance profile"| ses
    api -->|"HTTPS"| ors

    classDef pessoa fill:#08427b,stroke:#052e56,color:#fff
    classDef container fill:#438dd5,stroke:#2e6295,color:#fff
    classDef dados fill:#438dd5,stroke:#2e6295,color:#fff
    classDef externo fill:#999,stroke:#6b6b6b,color:#fff
    class usuario pessoa
    class spa,caddy,web,api container
    class db,comprovantes dados
    class ses,ors,osm externo
```

### Decisões visíveis neste nível

**A SPA e a API ficam atrás do mesmo domínio.** O frontend chama `/api` em
caminho relativo, não uma URL absoluta. Não existe requisição entre origens
diferentes, então não há CORS a configurar em produção, e o pacote compilado não
fica preso a um domínio escolhido no momento do build.

**Caddy e nginx coexistem de propósito.** O nginx já servia a SPA e já
encaminhava `/api`; o Caddy entrou **na frente** apenas para o TLS, porque obtém
e renova o certificado sozinho — sem `cron`, sem *hook* de renovação e sem
recarregar o nginx.

**Os comprovantes ficam em volume, não no banco e não na imagem.** A imagem é
recriada a cada deploy, então um arquivo gravado nela desapareceria. O banco
guarda apenas os metadados do comprovante — nome original, tipo, tamanho e
caminho.

> **Limitação conhecida.** Como os arquivos vivem num volume e os metadados no
> RDS, um *snapshot* do banco **não** cobre os comprovantes. Restaurar o banco
> sozinho devolveria entregas concluídas cujo comprovante não abre. A
> compensação é cópia do volume ou *snapshot* do EBS, junto do *snapshot* do
> banco.

---

## Nível 3 — Componentes da API

Como o contêiner `api` é organizado internamente.

```mermaid
flowchart TB
    cliente["<b>web</b> (nginx)<br/><i>encaminha /api</i>"]

    subgraph apic["Contêiner api — Node 22, Express 4"]
        routes["<b>routes</b><br/>Declara caminho e método,<br/>encaixa os middlewares"]

        subgraph mw["middlewares"]
            auth["<b>autenticacao</b><br/>Verifica o JWT,<br/>popula req.usuario"]
            perfil["<b>autorizacao</b><br/>Exige o perfil<br/>da rota"]
            upload["<b>uploadComprovante</b><br/>Multer, nome de arquivo<br/>gerado no servidor"]
            erro["<b>tratamentoDeErro</b><br/>Traduz erro de domínio<br/>em status HTTP"]
        end

        validators["<b>validators</b><br/><i>Zod</i><br/>Rejeita requisição malformada<br/>antes de chegar à regra"]
        controllers["<b>controllers</b><br/>Traduz HTTP em chamada<br/>de serviço, e de volta.<br/>Sem regra de negócio"]
        services["<b>services</b><br/><b>Toda a regra de negócio.</b><br/>Fábricas que recebem o<br/>Prisma por injeção"]
        email["<b>services/email</b><br/>Transporte trocável:<br/>SES, SMTP ou registro em log"]
        prisma["<b>Prisma Client</b><br/>Acesso ao banco,<br/>migrações versionadas"]
    end

    db[("RDS PostgreSQL")]
    arquivos[("volume de<br/>comprovantes")]
    ses["Amazon SES"]
    ors["OpenRouteService"]

    cliente --> routes
    routes --> auth
    auth --> perfil
    perfil --> validators
    validators --> controllers
    routes -.->|"só rotas de anexo"| upload
    upload --> controllers
    controllers --> services
    services --> prisma
    services --> email
    services -->|"grava e lê arquivo"| arquivos
    services -->|"consulta traçado"| ors
    email --> ses
    prisma --> db
    services -.->|"erro de domínio"| erro
    erro -.->|"resposta JSON"| cliente

    classDef comp fill:#85bbf0,stroke:#5d82a8,color:#000
    classDef dados fill:#438dd5,stroke:#2e6295,color:#fff
    classDef externo fill:#999,stroke:#6b6b6b,color:#fff
    class routes,validators,controllers,services,email,prisma,auth,perfil,upload,erro comp
    class db,arquivos dados
    class ses,ors externo
```

### A regra que organiza tudo

**A regra de negócio vive no `services`, e em nenhum outro lugar.** Controller
não decide; validador não decide; tela não decide. A consequência prática é que
uma requisição direta à API não contorna nenhuma regra — e foi por isso que o
comprovante obrigatório foi implementado no serviço, não no botão desabilitado.

**Os serviços recebem o Prisma por injeção.** Cada um é uma fábrica
`criarXService(prisma)`. É isso que permite testar a regra com um dublê, sem
banco rodando, e é a razão de a suíte do backend terminar em segundos no CI.

**O `services/email` tem transporte trocável.** Em produção, Amazon SES por
*instance profile*; em desenvolvimento, registro em log. A escolha é por
variável de ambiente, e um valor inválido faz a aplicação falhar ao subir, em
vez de descobrir o problema no primeiro e-mail que não chegou.

---

## O caminho de uma requisição

Exemplo: o motorista marca uma entrega como concluída.

```mermaid
sequenceDiagram
    autonumber
    participant M as Motorista<br/>(navegador)
    participant C as caddy
    participant N as web (nginx)
    participant A as api (Express)
    participant S as service
    participant D as RDS

    M->>C: PATCH /api/minhas-rotas/:id/concluir<br/>Authorization: Bearer ...
    C->>N: HTTP, com X-Forwarded-For
    N->>A: HTTP, acrescenta o próprio salto
    A->>A: autenticacao: valida o JWT
    A->>A: autorizacao: exige perfil MOTORISTA
    A->>A: validators: valida o corpo (Zod)
    A->>S: concluirEntrega(entregaId, motoristaId)
    S->>D: a entrega é deste motorista?
    D-->>S: sim
    S->>D: quantos comprovantes tem?
    D-->>S: 0
    S--xA: ValidationError<br/>"Anexe ao menos um comprovante"
    A-->>M: 422, mensagem em JSON
```

**Dois saltos de proxy, e por que isso importa.** O nginx recebe o
`X-Forwarded-For` do Caddy e acrescenta o próprio salto, então a API vê
`cliente, caddy`. O Express é configurado com `TRUST_PROXY=2`. Com o valor 1, o
IP lido seria o do contêiner do Caddy, e o limitador de requisições trataria
**todos os usuários como um cliente único** — sem nada no log indicando o
problema.

---

## Deploy

```mermaid
flowchart LR
    dev["👤 Desenvolvedor"]
    gh["GitHub<br/><i>push em main</i>"]
    actions["GitHub Actions<br/><i>lint, testes de backend<br/>e de frontend</i>"]
    oidc["AWS STS<br/><i>OIDC, sem chave<br/>armazenada</i>"]
    ssm["AWS Systems Manager<br/><i>envia o comando</i>"]
    ec2["Instância EC2<br/><i>constrói as imagens,<br/>sobe os contêineres,<br/>confere /health</i>"]

    dev -->|"git push"| gh
    gh --> actions
    actions -->|"assume a role"| oidc
    oidc -->|"credencial temporária"| actions
    actions -->|"send-command"| ssm
    ssm -->|"a instância busca<br/>o comando"| ec2

    classDef pessoa fill:#08427b,stroke:#052e56,color:#fff
    classDef passo fill:#438dd5,stroke:#2e6295,color:#fff
    class dev pessoa
    class gh,actions,oidc,ssm,ec2 passo
```

**Não há SSH e não há chave guardada.** O *security group* libera a porta 22
apenas para um IP fixo, e os *runners* do GitHub têm IP dinâmico. As saídas por
SSH seriam abrir a porta 22 para a internet ou versionar a chave privada da
instância — as duas piores do que o problema. Com o SSM, a instância é quem abre
a conexão para fora; nenhuma porta nova é exposta.

A confiança da role é amarrada a
`repo:davigpe/controlog:ref:refs/heads/main` com `StringEquals`, sem curinga:
nem outro ramo nem outro repositório conseguem assumi-la.

As migrações rodam **antes** de a API passar a escutar a porta. Migração que
falha significa contêiner que nunca fica saudável, o que significa deploy
reprovado — nada quebrado chega ao ar.

---

## Documentos relacionados

| Documento | O que cobre |
|---|---|
| [REQUISITOS.md](REQUISITOS.md) | Requisitos funcionais, não funcionais, regras de negócio e casos de uso |
| [DEPLOY_AWS.md](DEPLOY_AWS.md) | Provisionamento, variáveis de ambiente e contingência manual |
| [PLANO_DE_TESTES.md](PLANO_DE_TESTES.md) | Casos de teste por requisito e estratégia das duas camadas |
| [AUDITORIA_ACESSIBILIDADE.md](AUDITORIA_ACESSIBILIDADE.md) | Conformidade WCAG 2.1 AA |
