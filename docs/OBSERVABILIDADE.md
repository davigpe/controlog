# Observabilidade — Controlog

Como se descobre que o sistema está com problema, e como se investiga depois de
descobrir.

## 1. O que existe

| Camada | Onde | Responde |
|---|---|---|
| Verificação externa | Route 53 *health check* em `https://controlog.app/health/db`, a cada 30 s | A aplicação consegue atender, banco incluído? |
| Métrica de aplicação | Filtro de métrica sobre o log: respostas 5xx | A aplicação está quebrada para o usuário? |
| Métricas da instância | CloudWatch, nativas (CPU, *status check*) e customizadas (memória, swap, disco) | A máquina está no limite? |
| Métricas do banco | CloudWatch, nativas do RDS | O banco está no limite? |
| Log investigável | CloudWatch Logs, grupo `/controlog/aplicacao` | O que aconteceu, exatamente? |
| Notificação | Tópico SNS `controlog-alertas`, por e-mail | Alguém fica sabendo |
| Sincronia da senha do banco | Timer do systemd, a cada 1 min | A credencial do banco ainda é a atual depois da rotação? |

Tudo em CloudFormation, em [`infra/observabilidade.yml`](../infra/observabilidade.yml).

### Por que CloudWatch, e não Prometheus com Grafana

As diretrizes do portfólio citam New Relic, Datadog, Zabbix, Prometheus e
Grafana como exemplos. A escolha aqui não foi por preferência, e sim por uma
restrição física: **a instância tem 913 MiB de RAM**, e o build do frontend já
foi morto por falta de memória dentro dela — o processo morre com código 137, sem
erro de compilação, o que torna o sintoma difícil de ler.

Subir Prometheus e Grafana na mesma máquina significaria dois serviços
residentes competindo justamente pela memória que falta. O monitoramento cairia
junto com o que ele deveria observar, que é a pior falha possível numa
ferramenta de monitoramento. O CloudWatch já está na conta e não consome recurso
da instância.

## 2. Os nove alarmes

| Alarme | Dispara quando | Por que esse limite |
|---|---|---|
| `controlog-ec2-cpu-alta` | CPU > 80% por 15 min | Três períodos de 5 min, não um: a `t3.micro` é *burstable*, e pico de CPU durante o build do deploy é esperado. O que interessa é CPU alta sustentada |
| `controlog-ec2-verificacao-falhou` | *Status check* da EC2 falha 2× | `TreatMissingData: breaching` — ausência de dado aqui significa instância inacessível, não silêncio |
| `controlog-ec2-memoria-alta` | Memória > 90% por 10 min | **O alarme que mais importa nesta instância**, pelo motivo da seção anterior |
| `controlog-ec2-disco-cheio` | Disco > 85% por 10 min | Imagens Docker e volume de comprovantes crescem na mesma partição |
| `controlog-rds-cpu-alta` | CPU do banco > 80% por 15 min | Mesmo raciocínio da EC2 |
| `controlog-rds-espaco-baixo` | Espaço livre < 2 GB | São 10% dos 20 GB alocados. Banco sem espaço recusa escrita, e o sintoma na tela é erro em qualquer cadastro |
| `controlog-rds-conexoes-altas` | Conexões > 40 por 10 min | O `max_connections` é a fórmula padrão `LEAST({DBInstanceClassMemory/9531392},5000)`, lida do *parameter group* `default.postgres16`, que na `db.t4g.micro` de 1 GiB resulta em algo em torno de 100. 40 é aviso antecipado; conexão vazando é a causa mais comum de chegar lá |
| `controlog-app-erros-5xx` | Mais de 5 respostas 5xx em 5 min | Diferente dos alarmes de recurso, mede o que o usuário sente |
| `controlog-site-fora-do-ar` | `/health/db` deixa de responder 2× | Verificação de **fora** da AWS, e a única que prova que a aplicação consegue trabalhar |

Nove alarmes cabem no nível gratuito do CloudWatch, que cobre dez.

### Duas decisões nos alarmes que valem explicação

**`/health/db`, e não `/health` nem a raiz, na verificação externa.** Os três
respondem coisas diferentes, e a diferença custou cinco horas de
indisponibilidade:

| Endereço | O que prova | O que **não** prova |
|---|---|---|
| `/` | O nginx está servindo arquivos | Nada sobre a API — responde 200 com a API inteira fora |
| `/health` | O processo da API subiu e responde | Nada sobre o banco |
| `/health/db` | A API consegue autenticar e consultar o banco | — |

> **O incidente.** Em 16/11/2026 a rotação automática da senha mestra do RDS
> invalidou a credencial do `.env.production`. Todo login passou a responder
> **500** — e o `/health`, que era o endereço desta verificação, seguiu
> devolvendo 200, porque não tocava em dependência nenhuma. O alarme ficou em
> `OK` por cinco horas e quem descobriu a queda foi o usuário tentando entrar.
>
> O alarme de 5xx também não pegou: o limite é mais de 5 respostas 5xx em 5
> minutos, e com pouco tráfego três tentativas de login não chegam lá. Medir
> *liveness* responde "o processo está vivo?". A pergunta que importa é "ele
> consegue atender?", e essa exige falar com o banco.

`/health` continua existindo e continua sendo o que o `healthcheck` do contêiner
consulta — ali é certo medir só liveness, porque um banco momentaneamente
indisponível não significa contêiner quebrado e não deve marcá-lo como tal.

**`TreatMissingData` é diferente em cada alarme, de propósito.** Ausência de dado
significa coisas opostas: no *status check* da EC2 significa instância
inacessível (`breaching`); nas métricas customizadas significa que o cron ainda
não rodou (`missing`, para não disparar ruído logo depois da stack subir); na CPU
significa máquina ociosa (`notBreaching`).

## 3. A senha do banco rotaciona sozinha

O RDS usa **senha mestra gerenciada pela AWS**: ela vive no Secrets Manager, num
segredo `rds!db-…` de propriedade do serviço `rds`, com **rotação automática a
cada 7 dias**.

Isso é bom para segurança e incompatível com senha escrita em arquivo. A cada
rotação, o `DATABASE_URL` do `.env.production` fica velho e **todo acesso ao
banco passa a responder 500** — foi exatamente o incidente descrito acima.

A ponte é
[`scripts/sincronizar-senha-do-banco.sh`](../scripts/sincronizar-senha-do-banco.sh),
disparado por timer do systemd a cada minuto:

1. Descobre o ARN do segredo a partir da instância de banco
   (`MasterUserSecret.SecretArn`), em vez de tê-lo fixo em arquivo — o sufixo do
   ARN é aleatório e muda se o banco for recriado.
2. Lê o segredo usando a credencial do *instance profile*. Nenhuma chave
   envolvida.
3. Reescreve `DATABASE_URL` e `DIRECT_URL` preservando host, porta, base e
   parâmetros.
4. Se nada mudou, encerra sem tocar em nada — por isso pode rodar a cada
   minuto.
5. Se mudou, recria **apenas** o contêiner `api` e confere `/health/db` antes de
   declarar sucesso.

**A pior janela de indisponibilidade é o intervalo do timer**: cerca de um minuto
entre a rotação e a correção.

O intervalo saiu de medição, não de estimativa. Com cinco minutos, uma rotação
forçada em 16/11/2026 deixou o sistema fora por **5 min e 3 s**, enquanto o
alarme `controlog-site-fora-do-ar` levou **4 min e 47 s** para disparar — o
e-mail chegava junto com o problema já resolvido, que é ruído sem utilidade. Com
um minuto, a recuperação acontece antes de o alarme disparar, e o alarme volta a
significar o que deve: a recuperação automática falhou.

O custo é uma chamada ao Secrets Manager por minuto, cerca de 43 mil por mês, a
US$ 0,05 por 10 mil — **aproximadamente US$ 0,22 mensais**. Não é nível
gratuito; é barato.

### Três detalhes do script que não são óbvios

**A troca é feita em Python, não em `sed`.** Senha gerada pela AWS contém
caracteres como `/`, `@`, `#`, `%` e `?`, que precisam ser *percent-encoded* para
caber na URL do Prisma. Escapar isso em `sed` é fonte garantida de erro
silencioso — e erro silencioso aqui significa uma senha que não funciona escrita
com cara de certa.

**O script pega a mesma trava do deploy.** Recriar o contêiner da `api` enquanto
um deploy constrói imagens é precisamente a corrida que derrubou a produção por
25 horas. Com `flock -n`, se houver deploy em andamento o tique desiste e o
próximo tenta de novo.

**A senha nunca aparece em log nem em linha de comando.** Ela trafega por
variável de shell e por *stdin*; argumento de processo seria visível em `ps` para
qualquer usuário da máquina. O script imprime apenas `inalterado` ou
`alterado`.

## 4. Memória e disco: por que um script, e não o agente

A EC2 não expõe memória nem espaço em disco. O hipervisor vê CPU, rede e o
volume, mas não vê dentro do sistema operacional — essas três só saem de dentro.

A forma usual é instalar o agente do CloudWatch. Aqui foi
[`scripts/metricas-instancia.sh`](../scripts/metricas-instancia.sh) disparado por
um timer do systemd, pelo mesmo motivo da escolha do CloudWatch: nesta instância
a memória é o recurso escasso, e um agente residente consumiria parte justamente
do que precisa ser medido. O script sobe, publica três valores e sai — não há
processo parado ocupando memória entre as execuções.

Dois detalhes dele que não são óbvios:

- Usa **`MemAvailable`**, não `MemFree`. O Linux usa a memória livre como cache
  de página, então `MemFree` fica próximo de zero numa máquina saudável — e
  produziria alarme permanente.
- Pede **token do IMDSv2** antes de ler o metadata. Sem o token a instância
  responde 401, e o sintoma seria métrica publicada sem a dimensão `InstanceId`,
  que não casa com nenhum alarme: o painel ficaria vazio sem nada quebrado
  aparentemente.

## 5. O log da aplicação

O log da API vai para o grupo `/controlog/aplicacao`, com retenção de 14 dias.
Curta de propósito: o log serve para investigar incidente recente, e retenção
longa cobra armazenamento todo mês sem ser lida.

Fica numa **sobreposição opcional**,
[`docker-compose.logs.yml`](../docker-compose.logs.yml), ativada por
`CONTROLOG_LOGS_CLOUDWATCH=1` no `.env.production` da instância. O motivo é
concreto: o driver `awslogs` **impede o contêiner de subir** se o grupo de log
não existir. No arquivo principal, um ambiente sem a stack de observabilidade
deixaria de subir, e o sintoma seria o deploy falhando longe da causa.

> **O modo `non-blocking` é a parte que mais importa desse arquivo.** No modo
> padrão, `blocking`, a escrita de log bloqueia o processo quando o CloudWatch
> está lento ou inacessível — uma indisponibilidade do serviço de log viraria
> indisponibilidade da API. Em `non-blocking` o Docker usa um buffer em memória e
> descarta log se ele encher, que é a troca certa: perder linha de log é muito
> melhor do que travar requisição.

O log do nginx fica de fora. Ele registra toda requisição de arquivo estático, o
que seria a maior parte do volume e quase nenhum sinal. Para investigar o proxy,
`docker compose logs web` continua disponível na instância.

### `/health` bem-sucedido também fica de fora

Medido com o log já funcionando: o *health check* do Route 53 consulta `/health`
a cada 30 s **de vários verificadores em regiões diferentes** — oito endereços
distintos apareceram em poucos segundos — e o `healthcheck` do contêiner
acrescenta o seu. Juntos, eram praticamente todo o conteúdo do grupo de log.

Isso custa ingestão para registrar que está tudo bem, e afoga o que importa: a
consulta de erros e o widget do painel ficam cheios de linhas 200 do verificador.
O morgan agora dispensa `/health` quando a resposta é abaixo de 400:

```js
skip: (req, res) => req.path === '/health' && res.statusCode < 400,
```

**Falha continua registrada.** Um `/health` respondendo 503 é exatamente o que se
quer ver no log, e passa pelo filtro.

### O formato do log é pré-requisito, não detalhe

Fora de desenvolvimento a API usa o formato **`combined`** do morgan. Antes usava
`dev` em todo ambiente que não fosse teste, e isso quebrava a observabilidade de
duas formas silenciosas:

- O `dev` escreve `GET /api/rotas 500 12.3 ms - 123` — **sem** a versão do
  protocolo. O padrão de métrica que conta 5xx nunca casaria, e o alarme
  `controlog-app-erros-5xx` simplesmente nunca dispararia, sem nada indicando o
  problema.
- O `dev` emite códigos ANSI de cor **sempre**, inclusive sem terminal. No
  CloudWatch isso vira lixo no meio da linha e atrapalha o `parse` das consultas
  abaixo.

O padrão de métrica usa correspondência de termo, e não expressão regular entre
`%`: o CloudWatch recusa a aspa e a barra dentro de `%...%` com
`Invalid character(s) in term`. Foi verificado com `aws logs test-metric-filter`
— casa 500, 503 e 502, e não casa 200, 422, nem um 200 com `content-length`
5555, que seria o falso positivo de procurar apenas por `5`.

### Consultas úteis no Logs Insights

```sql
-- Erros das últimas horas
fields @timestamp, @message
| filter @message like /(?i)(error|erro)/
| sort @timestamp desc
| limit 100
```

```sql
-- Respostas 5xx, agrupadas por rota
parse @message /"(?<metodo>\w+) (?<rota>\S+) HTTP\/1\.[01]" (?<status>\d{3})/
| filter status >= 500
| stats count() as total by rota, status
| sort total desc
```

```sql
-- Falha de envio de e-mail (que não vira erro de resposta, de propósito)
fields @timestamp, @message
| filter @message like /redefini|e-mail|email/
| sort @timestamp desc
| limit 50
```

## 6. Custo

| Item | Custo |
|---|---|
| 9 alarmes | Gratuito — o nível gratuito cobre 10 |
| 1 painel | Gratuito — o nível gratuito cobre 3 |
| Métricas customizadas (3) | Gratuito até 10 |
| Logs | Por GB ingerido; o volume da API é baixo, e a retenção de 14 dias limita o armazenamento |
| Leitura do segredo a cada minuto | ~43 mil chamadas/mês a US$ 0,05 por 10 mil ≈ **US$ 0,22/mês** |
| *Health check* do Route 53 | Pago; ver abaixo |

O *health check* pode ser desligado com `CriarChecagemExterna=nao` nos
parâmetros, e os outros oito alarmes continuam funcionando — o que se perde é a
verificação de fora da AWS, que é justamente a única que enxerga o sistema como
o usuário o vê.

A leitura do segredo pode ficar mais barata subindo o intervalo do timer de 1
para 5 minutos (cai para ~US$ 0,04/mês), ao custo de a janela de
indisponibilidade numa rotação voltar a ultrapassar o tempo de disparo do
alarme. A seção 3 tem os números medidos.

> Não consegui confirmar o preço atual do *health check* nesta sessão: a sessão
> da AWS estava expirada. Confirme na página de preços do Route 53, já que o
> orçamento do projeto é de 10 dólares por mês.

## 7. Como subir

Três passos, e o segundo depende do primeiro.

### 1. A stack de observabilidade

```bash
aws cloudformation deploy \
  --template-file infra/observabilidade.yml \
  --stack-name controlog-observabilidade \
  --region us-east-1 --profile controlog \
  --parameter-overrides \
    InstanceId=<id-da-instancia> \
    IdentificadorDoBanco=<identificador-do-rds> \
    EmailDeAlerta=<seu-email>
```

**Confirme a inscrição no e-mail que chega do SNS.** Sem confirmar, os alarmes
disparam e não notificam ninguém — e isso não aparece em lugar nenhum como erro.

### 2. A permissão na role da instância

A role `controlog-ec2-ssm` ganhou duas permissões em
[`infra/cicd.yml`](../infra/cicd.yml): escrever no grupo de log e publicar
métrica no namespace `Controlog/Instancia`. O `AmazonSSMManagedInstanceCore` não
cobre nenhuma das duas — ele dá acesso aos canais do SSM, não ao CloudWatch.

```bash
aws cloudformation deploy \
  --template-file infra/cicd.yml \
  --stack-name controlog-cicd \
  --region us-east-1 --profile controlog \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides InstanceId=<id-da-instancia>
```

> Sem este passo o script de métricas falha com `AccessDenied` e o driver de log
> impede o contêiner de subir. É a dependência que mais provavelmente passa
> despercebida.

### 3. O timer das métricas, na instância

```powershell
ssh -i "C:\Users\davig\Downloads\controlog-key.pem" ec2-user@35.173.160.71
```

```bash
cd ~/controlog
sudo install -m 755 scripts/metricas-instancia.sh /usr/local/bin/controlog-metricas

# Publica uma vez, à mão, antes de agendar: imprime os três valores e mostra na
# hora se a permissão da role já propagou.
/usr/local/bin/controlog-metricas

sudo install -m 644 infra/systemd/controlog-metricas.service /etc/systemd/system/
sudo install -m 644 infra/systemd/controlog-metricas.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now controlog-metricas.timer

systemctl list-timers controlog-metricas.timer
```

> **Timer do systemd, e não `crontab`.** O Amazon Linux 2023 **não traz o
> `cronie` instalado** — `crontab` responde `command not found`. Instalar o
> cronie resolveria, mas acrescentaria um daemon residente nesta instância de
> 913 MiB, que é exatamente o recurso que estas métricas existem para vigiar. O
> systemd já está aqui como PID 1, e o timer tem duas vantagens de brinde:
> `Persistent=true` executa na volta se a instância estiver desligada na hora do
> disparo, e `journalctl -u controlog-metricas` dá o histórico de execução, que o
> cron não dá.

**Confira que o `list-timers` mostra um próximo disparo.** O esperado é algo como:

```
NEXT                        LEFT     LAST  PASSED  UNIT
Mon 2026-11-16 03:25:00 UTC 2min ...  ...   ...     controlog-metricas.timer
```

`NEXT -` e `LEFT -` significam **timer sem próximo disparo agendado**, e foi o que
aconteceu na primeira versão: ela usava `OnUnitActiveSec=5min`, que ancora o
próximo disparo na última *ativação* do serviço — e um `Type=oneshot` que falha
não registra ativação. O serviço falhou na primeira execução e o timer ficou
parado para sempre, ou seja, o monitoramento morria junto com a primeira falha,
exatamente quando precisava continuar tentando.

Hoje o timer usa `OnCalendar=*:0/5`, que é absoluto: dispara nos minutos 0, 5,
10… de toda hora, independentemente de a execução anterior ter dado certo. Como
efeito colateral, o `Persistent=true` passou a valer — ele só tem efeito com
`OnCalendar`, e em timer monotônico o systemd o ignora.

Se a execução manual falhar com `ParamValidation` em `Dimensions`, o script na
instância é anterior à 1.11.3: em `--metric-data`, `Dimensions` é uma lista de
estruturas, e a sintaxe abreviada `Dimensions=InstanceId=…` é recusada. O script
usa JSON por isso.

### 4. O timer da senha do banco, na instância

```bash
cd ~/controlog
sudo install -m 755 scripts/sincronizar-senha-do-banco.sh /usr/local/bin/controlog-senha-banco

# Primeira execução à mão. Imprime apenas `inalterado` ou `alterado`, nunca a
# senha. Se der AccessDenied, a permissão do passo 2 não propagou.
/usr/local/bin/controlog-senha-banco

sudo install -m 644 infra/systemd/controlog-senha-banco.service /etc/systemd/system/
sudo install -m 644 infra/systemd/controlog-senha-banco.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now controlog-senha-banco.timer

systemctl list-timers controlog-senha-banco.timer
```

Como no timer das métricas, confira que o `NEXT` tem data e hora, e não `-`.

> **Sem este passo, a aplicação quebra a cada 7 dias.** A rotação da senha
> mestra do RDS é automática e não avisa; o que avisa é o alarme
> `controlog-site-fora-do-ar`. Com este timer instalado o alarme não chega a
> disparar numa rotação normal, porque a correção acontece antes dos dois
> períodos de 60 s que ele exige — se ele disparar, é sinal de que a recuperação
> automática falhou, que é exatamente o que um alarme deve significar.

### 5. O envio de log, quando quiser ligar

```bash
echo 'CONTROLOG_LOGS_CLOUDWATCH=1' >> .env.production
bash scripts/deploy-instancia.sh
```

O script detecta a variável e inclui a sobreposição. Para desligar, remova a
linha e publique de novo.

## 8. Como verificar que está funcionando

| O quê | Como |
|---|---|
| Métricas da instância chegando | O painel mostra memória, swap e disco com dado dos últimos 15 min |
| Log chegando | `aws logs tail /controlog/aplicacao --follow --profile controlog` |
| Notificação funcionando | `aws cloudwatch set-alarm-state --alarm-name controlog-ec2-memoria-alta --state-value ALARM --state-reason teste` e conferir se o e-mail chega |
| Verificação externa | O alarme `controlog-site-fora-do-ar` deve estar em `OK`, não em `INSUFFICIENT_DATA` |
| Readiness de verdade | `curl -s https://controlog.app/health/db` deve devolver `"banco":"ok"` |
| Sincronia da senha | `systemctl list-timers controlog-senha-banco.timer` com `NEXT` preenchido, e `journalctl -u controlog-senha-banco -n 5` mostrando `inalterado` |

O da notificação é o que mais vale fazer: alarme configurado com inscrição SNS
não confirmada é o modo de falha mais comum deste tipo de montagem, e não dá
nenhum sinal de que está errado.

### O teste que prova que o incidente não se repete

Força uma rotação e confere que o sistema se recupera sozinho:

```bash
# na sua máquina — rotaciona a senha mestra agora
aws secretsmanager rotate-secret --profile controlog --region us-east-1 \
  --secret-id "$(aws rds describe-db-instances --profile controlog --region us-east-1 \
      --db-instance-identifier controlog-db \
      --query 'DBInstances[0].MasterUserSecret.SecretArn' --output text)"
```

Esperado: `https://controlog.app/health/db` falha por alguns minutos, o timer
detecta, recria a `api`, e volta a `"banco":"ok"` sem ninguém intervir. O
`journalctl -u controlog-senha-banco` registra `alterado`.

> Faça isso quando puder acompanhar. A rotação é real e a janela de
> indisponibilidade também — cerca de um minuto.

## Documentos relacionados

| Documento | O que cobre |
|---|---|
| [ARQUITETURA.md](ARQUITETURA.md) | Diagramas C4 e topologia de produção |
| [DEPLOY_AWS.md](DEPLOY_AWS.md) | Provisionamento e deploy |
| [SEGURANCA.md](SEGURANCA.md) | Análise estática, SAST e dependências |
