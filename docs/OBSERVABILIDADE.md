# Observabilidade — Controlog

Como se descobre que o sistema está com problema, e como se investiga depois de
descobrir.

## 1. O que existe

| Camada | Onde | Responde |
|---|---|---|
| Verificação externa | Route 53 *health check* em `https://controlog.app/health`, a cada 30 s | O site está no ar para quem acessa? |
| Métrica de aplicação | Filtro de métrica sobre o log: respostas 5xx | A aplicação está quebrada para o usuário? |
| Métricas da instância | CloudWatch, nativas (CPU, *status check*) e customizadas (memória, swap, disco) | A máquina está no limite? |
| Métricas do banco | CloudWatch, nativas do RDS | O banco está no limite? |
| Log investigável | CloudWatch Logs, grupo `/controlog/aplicacao` | O que aconteceu, exatamente? |
| Notificação | Tópico SNS `controlog-alertas`, por e-mail | Alguém fica sabendo |

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
| `controlog-rds-espaco-baixo` | Espaço livre < 2 GB | Banco sem espaço recusa escrita, e o sintoma na tela é erro em qualquer cadastro |
| `controlog-rds-conexoes-altas` | Conexões > 40 por 10 min | Na `db.t3.micro` o limite efetivo fica perto de 80; conexão vazando é a causa mais comum de chegar lá |
| `controlog-app-erros-5xx` | Mais de 5 respostas 5xx em 5 min | Diferente dos alarmes de recurso, mede o que o usuário sente |
| `controlog-site-fora-do-ar` | `/health` deixa de responder 2× | Verificação de **fora** da AWS |

Nove alarmes cabem no nível gratuito do CloudWatch, que cobre dez.

### Duas decisões nos alarmes que valem explicação

**`/health`, e não a raiz, na verificação externa.** A raiz devolve o HTML da SPA,
servido pelo nginx a partir de arquivos estáticos — ela continuaria respondendo
200 com a API completamente fora. `/health` passa pela API, então mede o que
interessa.

**`TreatMissingData` é diferente em cada alarme, de propósito.** Ausência de dado
significa coisas opostas: no *status check* da EC2 significa instância
inacessível (`breaching`); nas métricas customizadas significa que o cron ainda
não rodou (`missing`, para não disparar ruído logo depois da stack subir); na CPU
significa máquina ociosa (`notBreaching`).

## 3. Memória e disco: por que um script, e não o agente

A EC2 não expõe memória nem espaço em disco. O hipervisor vê CPU, rede e o
volume, mas não vê dentro do sistema operacional — essas três só saem de dentro.

A forma usual é instalar o agente do CloudWatch. Aqui foi
[`scripts/metricas-instancia.sh`](../scripts/metricas-instancia.sh) no cron, pelo
mesmo motivo da escolha do CloudWatch: nesta instância a memória é o recurso
escasso, e um agente residente consumiria parte justamente do que precisa ser
medido. O script sobe, publica três valores e sai.

Dois detalhes dele que não são óbvios:

- Usa **`MemAvailable`**, não `MemFree`. O Linux usa a memória livre como cache
  de página, então `MemFree` fica próximo de zero numa máquina saudável — e
  produziria alarme permanente.
- Pede **token do IMDSv2** antes de ler o metadata. Sem o token a instância
  responde 401, e o sintoma seria métrica publicada sem a dimensão `InstanceId`,
  que não casa com nenhum alarme: o painel ficaria vazio sem nada quebrado
  aparentemente.

## 4. O log da aplicação

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

## 5. Custo

| Item | Custo |
|---|---|
| 9 alarmes | Gratuito — o nível gratuito cobre 10 |
| 1 painel | Gratuito — o nível gratuito cobre 3 |
| Métricas customizadas (3) | Gratuito até 10 |
| Logs | Por GB ingerido; o volume da API é baixo, e a retenção de 14 dias limita o armazenamento |
| *Health check* do Route 53 | **Único item pago da stack** |

O *health check* pode ser desligado com `CriarChecagemExterna=nao` nos
parâmetros, e os outros oito alarmes continuam funcionando — o que se perde é a
verificação de fora da AWS.

> Não consegui confirmar o preço atual do *health check* nesta sessão: a sessão
> da AWS estava expirada. Confirme na página de preços do Route 53 antes de
> subir, já que o orçamento do projeto é de 10 dólares por mês.

## 6. Como subir

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

### 3. O cron das métricas, na instância

```bash
sudo install -m 755 scripts/metricas-instancia.sh /usr/local/bin/controlog-metricas
/usr/local/bin/controlog-metricas          # confere que publica antes de agendar
( crontab -l 2>/dev/null; echo '*/5 * * * * /usr/local/bin/controlog-metricas' ) | crontab -
```

### 4. O envio de log, quando quiser ligar

```bash
echo 'CONTROLOG_LOGS_CLOUDWATCH=1' >> .env.production
bash scripts/deploy-instancia.sh
```

O script detecta a variável e inclui a sobreposição. Para desligar, remova a
linha e publique de novo.

## 7. Como verificar que está funcionando

| O quê | Como |
|---|---|
| Métricas da instância chegando | O painel mostra memória, swap e disco com dado dos últimos 15 min |
| Log chegando | `aws logs tail /controlog/aplicacao --follow --profile controlog` |
| Notificação funcionando | `aws cloudwatch set-alarm-state --alarm-name controlog-ec2-memoria-alta --state-value ALARM --state-reason teste` e conferir se o e-mail chega |
| Verificação externa | O alarme `controlog-site-fora-do-ar` deve estar em `OK`, não em `INSUFFICIENT_DATA` |

O terceiro é o que mais vale fazer: alarme configurado com inscrição SNS não
confirmada é o modo de falha mais comum deste tipo de montagem, e não dá nenhum
sinal de que está errado.

## Documentos relacionados

| Documento | O que cobre |
|---|---|
| [ARQUITETURA.md](ARQUITETURA.md) | Diagramas C4 e topologia de produção |
| [DEPLOY_AWS.md](DEPLOY_AWS.md) | Provisionamento e deploy |
| [SEGURANCA.md](SEGURANCA.md) | Análise estática, SAST e dependências |
