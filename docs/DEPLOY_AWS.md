# Deploy na AWS — Controlog

Guia de migração da Vercel + Neon para a AWS. O deploy atual continua no ar
enquanto este não estiver funcionando — nada aqui desliga o que já existe.

Para a arquitetura anterior, ver [`DEPLOY.md`](DEPLOY.md).

## Arquitetura

```
                        Internet
                            │
                      :80 / :443
                            │
┌───────────────────────────┴────────────────────────────┐
│  EC2 (Amazon Linux 2023)                               │
│                                                        │
│  ┌──────────────────┐        ┌─────────────────────┐   │
│  │ web  (nginx)     │        │ api  (Node/Express) │   │
│  │ serve o site     │──/api──▶ porta 3333          │   │
│  │ e encaminha /api │        │ sem porta no host   │   │
│  └──────────────────┘        └──────────┬──────────┘   │
│         docker compose                  │              │
└─────────────────────────────────────────┼──────────────┘
                                          │ VPC privada
                                   ┌──────┴───────┐
                                   │ RDS Postgres │
                                   └──────────────┘
```

Uma instância EC2 roda os dois contêineres com Docker Compose. O banco fica
no RDS, fora da instância.

**Por que o site e a API no mesmo host.** O nginx serve o site e encaminha
`/api` para o contêiner da API, então os dois têm a mesma origem. Isso
resolve de uma vez as duas limitações registradas no deploy anterior:

- **Sem CORS.** Mesma origem, nada de `CORS_ORIGIN` de origem única
  bloqueando preview.
- **Sem URL de API embutida no build.** O cliente passa a usar `/api`
  relativo, então trocar de domínio não exige reconstruir o frontend. Antes,
  `VITE_API_URL` era resolvida em tempo de build e ficava congelada no bundle.

A API não publica porta no host: só o nginx fica exposto. Não há como
alcançá-la por fora pulando o proxy.

## Estado atual

No ar desde **09/11/2026** em **http://52.71.237.16**, na versão `1.6.1`.

| Recurso | Valor |
|---|---|
| EC2 | `t3.micro`, Amazon Linux 2023, 2 vCPU, 913 MiB + 2 GiB de swap |
| RDS | `controlog-db`, PostgreSQL, sem acesso público (IP privado na VPC) |
| Região | `us-east-1` |

Conferido na subida: as sete migrations aplicadas no RDS por TLS
(`sslmode=require`), seed executado, login pelo proxy, categorias de veículo
e o filtro por categoria, o relatório de rotas do dia, fallback de rota
profunda do React Router, `Cache-Control` único nos assets, e os dois limites
de corpo respondendo 413 — o do nginx (2 MB) e o da aplicação (1 MB, com a
mensagem que orienta a dividir a planilha). Zero reinícios nos dois
contêineres.

Ainda em **HTTP**: o domínio `controlog.app` foi registrado, mas o Elastic IP
e o registro `A` faltam, e é deles que depende a emissão do certificado (ver
passo 6). Os arquivos do HTTPS já estão no repositório e validados com
`docker compose config`.

O que ainda não foi exercitado em produção: carga real, falha do RDS e
restauração de snapshot.

## Custo — leia antes de criar a conta

O nível gratuito da AWS mudou. Contas criadas **a partir de 15/07/2025** não
recebem mais os 12 meses com 750 h/mês de EC2 e RDS; recebem um **plano
gratuito de 6 meses baseado em crédito**, de até US$ 200, que expira 12 meses
após a criação da conta. O uso de EC2 e RDS é descontado desse saldo. Contas
antigas seguem no modelo anterior.

Confirme o que a **sua** conta tem no [painel de billing](https://console.aws.amazon.com/billing/home#/freetier)
antes de subir qualquer coisa — isto muda com frequência e as fontes
secundárias divergem.

Ordem de grandeza se não houver cobertura (região `us-east-1`, 24/7):

| Recurso | Aproximado/mês |
|---|---|
| EC2 `t3.micro` + 8 GB EBS | ~US$ 8 |
| RDS `db.t4g.micro` + 20 GB | ~US$ 14 |
| **Total com RDS** | **~US$ 22** |
| **Total com Postgres em contêiner** (perfil `db-local`) | **~US$ 8** |

Se o orçamento apertar, o `docker-compose.prod.yml` tem um perfil
`db-local` que sobe o Postgres como contêiner na própria instância. Fica mais
barato ao custo de você passar a ser responsável por backup e atualização, e
de banco e aplicação caírem juntos. Para um TCC avaliado, o RDS é a escolha
mais defensável; para economizar, o perfil existe.

**Crie um alerta de orçamento** em Billing → Budgets antes de qualquer coisa.
É a única proteção real contra uma surpresa no fim do mês.

## Pré-requisitos

- Conta AWS com alerta de orçamento configurado
- Um par de chaves SSH (EC2 → Key Pairs)
- O repositório acessível a partir da instância (público, ou com deploy key)

---

## 1. Banco (RDS)

Console → RDS → Create database.

| Campo | Valor |
|---|---|
| Engine | PostgreSQL 16 |
| Template | Free tier (se a conta oferecer) ou Dev/Test |
| Instance | `db.t4g.micro` |
| Storage | 20 GB gp3, **sem** autoscaling (evita crescer a conta sem querer) |
| Public access | **No** |
| VPC | a mesma onde a EC2 vai ficar |
| Initial database name | `controlog` |
| Master username | `controlog` |

Guarde a senha: ela vai para `DATABASE_URL`.

**Security group do RDS:** libere a porta 5432 **apenas** para o security
group da EC2 (não para `0.0.0.0/0`). Como a instância não tem acesso público,
o banco só é alcançável de dentro da VPC.

> Criar o security group da EC2 antes facilita — faça o passo 2 primeiro se
> preferir, e volte aqui para a regra.

## 2. Instância (EC2)

Console → EC2 → Launch instance.

| Campo | Valor |
|---|---|
| AMI | Amazon Linux 2023 |
| Tipo | `t3.micro` |
| Key pair | o seu |
| Storage | 8 GB gp3 |
| VPC | a mesma do RDS |

**Security group da EC2** — três regras de entrada, e nada além disso:

| Porta | Origem | Para quê |
|---|---|---|
| 22 | **só o seu IP** | SSH |
| 80 | `0.0.0.0/0` | site |
| 443 | `0.0.0.0/0` | site com HTTPS (passo 6) |

Deixar o 22 aberto para o mundo é o erro mais comum e mais caro aqui: a
instância começa a receber tentativas de login em minutos.

Associe um **Elastic IP** à instância. Sem ele, o IP público muda a cada
parada/início — e o endereço que você entregou para avaliação deixa de
funcionar.

### Permissão da chave

O OpenSSH recusa a chave se ela estiver legível por outras contas.

**Linux/macOS:**

```bash
chmod 400 controlog-key.pem
```

**Windows** (`chmod` não tem efeito aqui: o ssh.exe olha as ACLs do NTFS,
não o bit de permissão do POSIX, e segue reclamando de "permissions are too
open" mesmo depois do chmod). No PowerShell, na pasta da chave:

```powershell
icacls controlog-key.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

## 3. Docker na instância

```bash
ssh -i sua-chave.pem ec2-user@SEU-IP

sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Plugin do Compose v2 (não vem no pacote do Docker no AL2023)
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

exit   # reconecte para o grupo docker valer
```

Confira depois de reconectar:

```bash
docker compose version
```

### Swap (faça antes do primeiro build)

A `t3.micro` tem 1 GiB de RAM e nenhuma swap. O build do frontend roda o
Vite/Rollup dentro do contêiner e é o passo mais pesado de tudo: sem swap ele
pode ser morto pelo OOM killer no meio, e o sintoma é confuso — o build
termina com `exit code 137` ou simplesmente "killed", sem erro de
compilação nenhum.

```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab   # sobrevive ao reboot

free -h   # deve mostrar 2.0Gi em Swap
```

Os 2 GiB saem do disco de 8 GB da instância, que sobra depois das imagens.

## 4. Subir a aplicação

```bash
git clone https://github.com/davigpe/controlog.git
cd controlog

cp .env.production.example .env.production
nano .env.production      # preencher — ver abaixo
```

O que preencher:

- `DATABASE_URL` e `DIRECT_URL` — o endpoint do RDS, com `?sslmode=require`.
  As duas são iguais: `DIRECT_URL` existe porque o Prisma exige uma conexão
  sem pooler para as migrations, e o RDS não tem pooler na frente (diferente
  do Neon).
- `JWT_SECRET` e `JWT_REFRESH_SECRET` — gere cada um com
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.
  Nunca reaproveite os do `.env.example`, que são públicos.
- `CORS_ORIGIN` — o endereço público. Nesta arquitetura não chega a ser
  exercitado (mesma origem), mas deixe correto.

Então:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

O primeiro build leva alguns minutos. A API aplica as migrations antes de
escutar a porta, e o nginx só sobe depois de ela ficar saudável — por isso o
`web` demora um pouco a aparecer.

```bash
docker compose -f docker-compose.prod.yml ps        # os dois devem estar healthy
curl -s http://localhost/health                     # {"status":"ok",...}
```

## 5. Popular o banco

Uma vez só, para criar o usuário gestor e os dados de exemplo:

```bash
docker compose -f docker-compose.prod.yml exec api node prisma/seed.js
```

Logins criados (senha `controlog123` nos dois): `gestor@controlog.com` e
`motorista@controlog.com`.

> **Troque essas senhas** antes de expor o sistema a qualquer pessoa real.
> São credenciais públicas, documentadas neste repositório.

Nesse ponto o sistema já responde em `http://SEU-IP`.

## 6. HTTPS

Sem certificado o navegador marca de "Não seguro" justamente a tela que pede
senha — o tipo de detalhe que pesa numa avaliação.

Os dois arquivos já existem no repositório: `Caddyfile` e
`docker-compose.https.yml`. O Caddy entra **na frente** do nginx em vez de
substituí-lo: termina o TLS e encaminha para o nginx, que continua servindo o
SPA e encaminhando `/api`. Trocar um pelo outro daria o mesmo resultado ao
custo de reescrever — e manter em dois lugares — as regras de cache, o
`client_max_body_size` e o fallback do React Router que já estão no
`nginx.conf`.

### Pré-requisitos

**1. Elastic IP.** O IP público da EC2 muda a cada stop/start, e um registro
de DNS apontando para um IP que mudou é um site fora do ar. EC2 → *Elastic
IPs* → *Allocate*, depois *Actions → Associate* na instância. Desde 2024 todo
IPv4 público é cobrado, então associar o Elastic IP só substitui o IP
automático, sem custo a mais; o que custa é deixá-lo alocado sem associar.

**2. Registro `A` no DNS**, apontando o domínio — e `www`, se mantiver o
redirecionamento do `Caddyfile` — para o Elastic IP. Confirme a propagação
antes de subir, com `nslookup seu-dominio.app`. Na Cloudflare o registro tem
de ficar como **DNS only** (nuvem cinza): com o proxy ligado, a Cloudflare
termina o TLS por conta própria e o desafio do Let's Encrypt não chega ao
Caddy.

**3. Porta 443 aberta** no security group da instância. A 80 continua
necessária depois da emissão: é por ela que o desafio HTTP-01 é validado nas
renovações, e que o Caddy redireciona `http` → `https`.

**4. Três variáveis no `.env.production`:**

```bash
CONTROLOG_DOMAIN="seu-dominio.app"
CORS_ORIGIN="https://seu-dominio.app"
TRUST_PROXY=2
```

`TRUST_PROXY=2` não é detalhe de arrumação. Com o Caddy na cadeia, o nginx
passa a mandar `X-Forwarded-For: <cliente>, <caddy>`, e o Express configurado
para confiar em 1 salto leria o IP do contêiner do Caddy — o rate limiter
trataria todos os usuários como um cliente só, sem nada no log explicando por
quê. `controlog-backend/tests/trustProxy.test.js` prende essa aritmética.

### Subir

```bash
cd controlog
docker compose -f docker-compose.prod.yml -f docker-compose.https.yml   --env-file .env.production up -d
```

O `--env-file` é obrigatório aqui, e não era no deploy em HTTP: o domínio é
lido na interpolação do próprio arquivo do Compose, e a interpolação não
enxerga o `env_file` dos serviços.

O certificado é pedido na subida. Para acompanhar:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.https.yml   --env-file .env.production logs -f caddy
```

`certificate obtained successfully` é o que se espera ver.

> Ao testar a configuração, descomente o `acme_ca` de homologação no
> `Caddyfile`. A cota de produção da Let's Encrypt é de 5 certificados por
> domínio por semana, e um punhado de tentativas erradas queima o domínio até
> a semana seguinte.

### Conferir

```bash
# 200, e o certificado válido
curl -sI https://seu-dominio.app | head -1

# o acesso em http deve redirecionar para https
curl -sI http://seu-dominio.app | grep -i location

# a API pelo caminho novo
curl -s https://seu-dominio.app/health
```


## 7. Atualizar o deploy

```bash
cd controlog
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

O Compose recria só o que mudou. As migrations novas são aplicadas pela API
ao subir.

## 8. Operação

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web

# Reiniciar só a API
docker compose -f docker-compose.prod.yml restart api

# Derrubar tudo (os dados ficam no RDS, não se perdem)
docker compose -f docker-compose.prod.yml down
```

**Backup.** O RDS faz snapshot automático se você habilitar na criação
(retenção de 7 dias é suficiente aqui). Com o perfil `db-local` não há backup
nenhum: você precisaria agendar um `pg_dump` por conta própria. É o principal
argumento a favor do RDS.

**Acessar o banco de fora.** O RDS não tem acesso público, então use um túnel
pela EC2:

```bash
ssh -i sua-chave.pem -L 5432:SEU-ENDPOINT.rds.amazonaws.com:5432 ec2-user@SEU-IP
# e conecte o cliente em localhost:5432
```

## Como conferir que subiu certo

Depois do `up -d`, rodando na instância:

```bash
# Os três (ou dois, com RDS) devem estar healthy, sem reinícios
docker compose -f docker-compose.prod.yml ps
docker inspect controlog-api-1 --format '{{.RestartCount}}'   # tem de ser 0

curl -s http://localhost/health                        # {"status":"ok",...}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost/
curl -s -o /dev/null -w '%{http_code}\n' http://localhost/rotas-do-dia
```

As duas últimas devem responder `200`.

O último é o que pega erro de SPA fallback: se vier 404, o `try_files` do
nginx não está valendo e só a página inicial funcionaria.

Reinício maior que zero quase sempre quer dizer que a API não alcançou o
banco na primeira tentativa — confira `DATABASE_URL` e o security group do
RDS com `docker compose logs api`.

## Alternativas consideradas

| Opção | Por que não |
|---|---|
| **ECS Fargate + ALB** | Mais "nativo em nuvem", mas o ALB sozinho custa ~US$ 16/mês e nunca entra no gratuito. Para uma instância só, é complexidade e custo sem retorno. |
| **S3 + CloudFront para o frontend** | Boa opção e barata, mas devolve o problema da origem cruzada: o site passa a ter um domínio e a API outro, e voltam o CORS e a URL embutida no build. Faz sentido se o tráfego crescer. |
| **Elastic Beanstalk** | Roda em EC2 por baixo, com uma camada a mais para entender e depurar. Sem ganho aqui. |
| **Lightsail** | Mais simples e com preço fixo, mas é justamente o tipo de plataforma gerenciada que a disciplina questionou na Vercel. |
| **App Runner** | Idem — gerenciado demais para o que a disciplina pede. |

As imagens Docker construídas aqui servem a qualquer uma dessas opções: a
preparação não fica presa à escolha do EC2.

## Sobre a restrição da disciplina

A disciplina deixou de aceitar hospedagem em plataformas otimizadas para
frontend estático (Vercel, Netlify, Firebase, Render). Esta arquitetura
atende: a aplicação roda num servidor que você provisiona e administra, com
banco gerenciado separado, e o deploy é reproduzível a partir dos arquivos
versionados neste repositório.

## O que ainda não está pronto

Honestidade sobre os limites deste deploy:

- **Sem automação de provisionamento.** A infraestrutura foi
  criada à mão pelo console; não há Terraform nem CloudFormation que a
  reproduza. Recriar do zero é repetir os passos 1 e 2 deste guia.
- **Ainda em HTTP.** O `Caddyfile` e o `docker-compose.https.yml` estão
  prontos e validados, mas o certificado só pode ser emitido depois do Elastic
  IP e do registro `A` — ver passo 6.
- **Sem deploy automático.** Atualizar é `git pull` + `up -d --build` por SSH.
  Um workflow do GitHub Actions que faça isso sozinho é um passo natural
  depois que o deploy manual estiver de pé.
- **Uma instância só.** Sem redundância: se ela cair, o sistema cai. É
  adequado ao escopo do projeto e não deve ser vendido como outra coisa.
