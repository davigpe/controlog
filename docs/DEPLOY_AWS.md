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

No ar desde **09/11/2026** em **https://controlog.app**, na versão `1.7.0`.

| Recurso | Valor |
|---|---|
| EC2 | `t3.micro`, Amazon Linux 2023, 2 vCPU, 913 MiB + 2 GiB de swap |
| RDS | `controlog-db`, PostgreSQL, sem acesso público (IP privado na VPC) |
| Região | `us-east-1` |
| IP | Elastic IP `35.173.160.71` |
| Domínio | `controlog.app`, registrado na Cloudflare, DNS only |
| TLS | Let's Encrypt, renovado pelo Caddy; `www` redireciona para o apex |

Conferido na subida: as sete migrations aplicadas no RDS por TLS
(`sslmode=require`), seed executado, login pelo proxy, categorias de veículo
e o filtro por categoria, o relatório de rotas do dia, fallback de rota
profunda do React Router, `Cache-Control` único nos assets, e os dois limites
de corpo respondendo 413 — o do nginx (2 MB) e o da aplicação (1 MB, com a
mensagem que orienta a dividir a planilha). Zero reinícios nos três
contêineres (`api`, `web` e `caddy`).

Conferido na virada para HTTPS: certificado válido nos dois nomes, `http`
respondendo 308 para `https`, `www` respondendo 301 para o apex, HSTS de um
ano, `Cache-Control` único nos assets e `no-store` no `index.html`, fallback de
rota profunda, e os dois limites de corpo ainda em 413.

O `TRUST_PROXY=2` foi verificado de ponta a ponta, não só no teste unitário:
requisições de dois IPs de origem diferentes caem em baldes separados do rate
limiter (299→298 de um, 294→293 do outro), e um `X-Forwarded-For` forjado não
cria balde próprio. Fosse o valor errado, os dois IPs compartilhariam o balde
do contêiner do Caddy.

Backup automático do RDS com retenção de **1 dia**, o teto do plano gratuito
da conta (ver *Backup* no passo 8). Orçamento de US$ 10/mês com alertas em
85% real, 100% previsto e 100% real.

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
docker compose -f docker-compose.prod.yml -f docker-compose.https.yml \
  --env-file .env.production up -d --build
```

> Na sua máquina existe o atalho `npm run prod:up:https`, mas **não na
> instância**: lá o Node nunca foi instalado, porque o build acontece dentro
> do contêiner. No servidor, use a linha do Compose acima.

O `--env-file` é obrigatório aqui, e não era no deploy em HTTP: o domínio é
lido na interpolação do próprio arquivo do Compose, e a interpolação não
enxerga o `env_file` dos serviços. Errar esse argumento faz o Compose abortar
com uma mensagem clara, em vez de subir o Caddy sem domínio.

O certificado é pedido na subida. Para acompanhar:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.https.yml \
  --env-file .env.production logs -f caddy
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

**O caminho normal é não fazer nada disto:** um push na `main` publica sozinho
(passo 9). Esta seção é o modo manual, para quando o workflow estiver fora do
ar ou você precisar intervir na instância.

```bash
cd controlog
git pull --ff-only origin main
bash scripts/deploy-instancia.sh
```

O script é o mesmo que o deploy automático executa: constrói, espera os
contêineres ficarem saudáveis, confere a aplicação pela porta pública e limpa
imagens órfãs.

Se precisar chamar o Compose direto, **inclua a sobreposição de HTTPS**:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.https.yml \
  --env-file .env.production up -d --build
```

Esquecer o segundo `-f` sobe a pilha sem o Caddy, e o site volta para HTTP com
a porta 443 sem ninguém escutando.

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

**Backup.** O RDS faz snapshot automático diário, e a retenção deste deploy
está em **1 dia** — não por escolha, mas porque é o máximo que o plano
gratuito da conta aceita; subir para 7 foi recusado pela própria AWS, e só um
upgrade de plano remove o limite. Na prática isso significa que um problema
percebido com mais de um dia de atraso pode não ter snapshot anterior a ele.

A compensação não custa nada: **snapshot manual** antes de qualquer coisa
arriscada — uma apresentação, uma migration nova, uma mudança de
infraestrutura. O snapshot manual não obedece à janela de retenção e fica
guardado até você apagar.

```bash
# No console: RDS → controlog-db → Actions → Take snapshot
# Ou, se o CLI tiver permissão de RDS:
aws rds create-db-snapshot \
  --db-instance-identifier controlog-db \
  --db-snapshot-identifier controlog-db-antes-da-apresentacao
```

Com o perfil `db-local` não há backup nenhum: você precisaria agendar um
`pg_dump` por conta própria. É o principal argumento a favor do RDS, mesmo
com a retenção curta.

**Os comprovantes de entrega não estão nesse backup.** As fotos e PDFs ficam
no volume `controlog-comprovantes`, num disco da EC2; o snapshot do RDS cobre
só o banco, que guarda apenas os metadados. Restaurar o banco sem o volume
devolve entregas concluídas cujo comprovante não abre mais — o service
responde 404 com texto próprio justamente para esse caso ficar legível em vez
de parecer defeito.

Para copiar o volume antes de um evento de risco:

```bash
docker run --rm \
  -v controlog_controlog-comprovantes:/origem:ro \
  -v "$PWD":/destino alpine \
  tar czf /destino/comprovantes-$(date +%F).tar.gz -C /origem .
```

Guardar isso fora da instância (S3, ou a sua máquina) é o que fecha a lacuna.
Enquanto não houver essa rotina, vale dizer na defesa que a prova de entrega
tem ponto único de falha — é uma limitação de escopo, não um descuido.

**Acessar o banco de fora.** O RDS não tem acesso público, então use um túnel
pela EC2:

```bash
ssh -i sua-chave.pem -L 5432:SEU-ENDPOINT.rds.amazonaws.com:5432 ec2-user@SEU-IP
# e conecte o cliente em localhost:5432
```

## 9. Deploy automático (GitHub Actions)

Um push na `main` publica sozinho, desde que os testes passem. O workflow é o
[.github/workflows/ci.yml](../.github/workflows/ci.yml): os jobs `backend` e
`frontend` rodam sempre, e o `deploy` depende dos dois (`needs`) e só roda em
push na `main`.

### Por que SSM e não SSH

O security group libera a porta 22 só para um IP fixo, e os runners do GitHub
têm IP dinâmico. As saídas por SSH seriam abrir a 22 para o mundo ou guardar a
chave privada da instância como segredo do repositório — nenhuma das duas é
aceitável.

Com o **Systems Manager** não há porta de entrada nova: a instância abre a
conexão para fora, e o GitHub manda o comando pela API da AWS. A chave `.pem`
não sai da sua máquina, e cada execução fica no CloudTrail com o nome de quem
a disparou.

A autenticação é por **OIDC**: o Actions prova quem é com um token de curta
duração, trocado por credencial temporária. Não há chave de acesso guardada no
GitHub. A confiança é amarrada em `repo:<dono>/<repo>:ref:refs/heads/main`, com
`StringEquals` e sem curinga — outro repositório, ou outro branch, não assume
a role.

### Criar as identidades

Uma vez só, com o perfil administrativo:

```bash
aws cloudformation deploy \
  --template-file infra/cicd.yml \
  --stack-name controlog-cicd \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides InstanceId=i-0312046515c971063 \
  --region us-east-1 --profile controlog
```

O template ([infra/cicd.yml](../infra/cicd.yml)) cria o provider OIDC do
GitHub, a role que o workflow assume e a role mais o instance profile que
tornam a instância gerenciável pelo SSM.

### Associar o instance profile

A instância já existia quando o template foi escrito, então o CloudFormation
não a anexa sozinho:

```bash
aws ec2 associate-iam-instance-profile \
  --instance-id i-0312046515c971063 \
  --iam-instance-profile Name=controlog-ec2-ssm \
  --region us-east-1 --profile controlog
```

Não reinicia nada. Em poucos minutos a instância aparece em Systems Manager →
*Fleet Manager* como nó gerenciado. Para conferir:

```bash
aws ssm describe-instance-information \
  --filters Key=InstanceIds,Values=i-0312046515c971063 \
  --region us-east-1 --profile controlog
```

### Variáveis no repositório

Em *Settings → Secrets and variables → Actions → **Variables***, não em
*Secrets*: nenhum dos dois valores é sigiloso, e deixá-los visíveis facilita
depurar um workflow.

| Nome | Valor |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | a saída `ArnDaRoleDeDeploy` da stack |
| `AWS_INSTANCE_ID` | `i-0312046515c971063` |

### O que roda na instância

O SSM dá `git pull` na `main` e chama
[scripts/deploy-instancia.sh](../scripts/deploy-instancia.sh), que constrói,
espera `api` e `web` ficarem saudáveis, confere `https://<domínio>/health`
pela porta pública e limpa imagens órfãs.

A verificação é pela porta pública de propósito: um contêiner saudável atrás
de um proxy quebrado passaria despercebido numa checagem por `localhost`.

Se qualquer etapa falhar, o script sai com erro, o SSM reporta `Failed` e o
job fica vermelho com as últimas 40 linhas do log do build.

> O `.env.production` continua só na instância. O workflow nunca o toca, e
> nenhum segredo de produção passa pelo GitHub.

## 10. E-mail transacional (Amazon SES)

É por aqui que sai o link de "esqueci minha senha". Sem isto configurado, o
transporte padrão é `registro`: o link vai para o log do servidor em vez de
chegar ao usuário.

### Por que SES, e sem chave de API

A instância já tem instance profile (`controlog-ec2-ssm`, do passo 9). O SDK da
AWS pega a credencial do metadata da instância, então **nenhuma chave de e-mail
entra no `.env.production` nem no repositório** — mesmo princípio do OIDC no
deploy. A permissão é concedida na role e restrita à identidade do domínio: a
instância não consegue enviar por nenhuma outra identidade da conta.

### Criar a identidade

```bash
aws cloudformation deploy \
  --template-file infra/email.yml \
  --stack-name controlog-email \
  --parameter-overrides Dominio=controlog.app \
  --region us-east-1 --profile controlog
```

E atualizar a stack do passo 9, que ganhou a permissão de envio:

```bash
aws cloudformation deploy \
  --template-file infra/cicd.yml \
  --stack-name controlog-cicd \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides InstanceId=i-0312046515c971063 DominioDeEmail=controlog.app \
  --region us-east-1 --profile controlog
```

### Registros no DNS

As saídas da stack `controlog-email` trazem o que cadastrar no Cloudflare:

```bash
aws cloudformation describe-stacks --stack-name controlog-email \
  --region us-east-1 --profile controlog \
  --query "Stacks[0].Outputs[].[OutputKey,OutputValue]" --output text
```

| Tipo | Nome | Conteúdo |
|---|---|---|
| CNAME ×3 | `NomeDkim1/2/3` | o `ValorDkim` correspondente |
| MX | `envio.controlog.app` | `feedback-smtp.us-east-1.amazonses.com`, prioridade 10 |
| TXT | `envio.controlog.app` | `v=spf1 include:amazonses.com ~all` |

Todos como **DNS only** (nuvem cinza). O proxy da Cloudflare não se aplica a
CNAME de verificação nem a MX, e deixá-lo ligado atrapalha a validação.

Os três CNAMEs são o DKIM, que assina as mensagens. O MX e o TXT alinham o
endereço de retorno ao seu domínio — sem eles o SES usa um domínio da Amazon,
o SPF desalinha e a mensagem tende a cair em spam.

> O `BehaviorOnMxFailure` está em `REJECT_MESSAGE`: se o MX não resolver, o
> envio falha em vez de voltar silenciosamente ao domínio da Amazon. Uma falha
> silenciosa aqui apareceria só como "o e-mail não chega para algumas pessoas".

### Sair do sandbox

Por padrão o SES só envia para endereços verificados. Para alcançar qualquer
destinatário — o professor testando "esqueci minha senha" com o e-mail dele,
por exemplo — é preciso pedir acesso de produção:

Console → **Amazon SES** → *Account dashboard* → **Request production access**.

Informe o caso de uso (redefinição de senha e notificações transacionais de um
sistema de gestão logística), o volume esperado (baixo) e como lida com
retornos. A aprovação costuma sair em até 24 horas. **Peça com antecedência da
apresentação.**

Enquanto o pedido não é aprovado, dá para testar verificando o seu próprio
endereço:

```bash
aws sesv2 create-email-identity --email-identity voce@exemplo.com \
  --region us-east-1 --profile controlog
```

### Ligar na aplicação

No `.env.production` da instância:

```bash
EMAIL_TRANSPORTE="ses"
EMAIL_REMETENTE="Controlog <nao-responda@controlog.app>"
```

E redeployar, para o contêiner reler o arquivo.

### Conferir

```bash
# A identidade precisa estar verificada
aws sesv2 get-email-identity --email-identity controlog.app \
  --region us-east-1 --profile controlog \
  --query "{verificada:VerifiedForSendingStatus,dkim:DkimAttributes.Status}"

# Ainda no sandbox?
aws sesv2 get-account --region us-east-1 --profile controlog \
  --query "{producao:ProductionAccessEnabled,envioHabilitado:SendingEnabled}"
```

Depois, pela aplicação: peça a redefinição em https://controlog.app/esqueci-senha
e confira a caixa de entrada. Falha de envio **não** aparece para o usuário —
ela é registrada no log do contêiner da API, com o destinatário, porque
responder diferente para e-mail cadastrado e não cadastrado permitiria
descobrir quais endereços existem no sistema.

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

- **Provisionamento só parcialmente automatizado.** As identidades do deploy
  (OIDC, roles, instance profile) estão em CloudFormation, em
  [infra/cicd.yml](../infra/cicd.yml). A infraestrutura que serve a aplicação
  — VPC, EC2, RDS, security groups — foi criada à mão pelo console e não tem
  template que a reproduza. Recriar do zero ainda é repetir os passos 1 e 2.
- **Retenção de backup de 1 dia**, teto do plano gratuito da conta. A
  compensação é o snapshot manual antes de cada evento de risco — ver *Backup*
  no passo 8.
- **Comprovantes de entrega sem backup automático.** Os arquivos ficam num
  volume do Docker na instância, fora do snapshot do RDS. O procedimento de
  cópia manual está em *Backup*, no passo 8.
- **E-mail depende da saída do sandbox do SES.** Antes da aprovação, só chega
  a destinatários verificados — ver passo 10. O envio em si já está pronto e
  cai para registro em log se o transporte não estiver configurado.
- **Uma instância só.** Sem redundância: se ela cair, o sistema cai. É
  adequado ao escopo do projeto e não deve ser vendido como outra coisa.
