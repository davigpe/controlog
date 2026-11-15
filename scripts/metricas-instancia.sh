#!/usr/bin/env bash
#
# Publica memoria, swap e disco da instancia como metricas no CloudWatch.
#
# Existe porque a EC2 nao expoe nenhuma das tres: o hipervisor ve CPU, rede e
# disco do volume, mas nao ve dentro do sistema operacional. Memoria em uso e
# espaco livre em disco so saem de dentro.
#
# E um script no cron, e nao o agente do CloudWatch, de proposito: nesta
# instancia a memoria e o recurso escasso — 913 MiB, e o build do frontend ja
# foi morto por falta dela aqui — e um agente residente consumiria parte
# justamente do que precisa ser medido. Este script sobe, publica tres valores
# e sai.
#
# Instalacao, na instancia:
#   sudo install -m 755 scripts/metricas-instancia.sh /usr/local/bin/controlog-metricas
#   ( crontab -l 2>/dev/null; echo '*/5 * * * * /usr/local/bin/controlog-metricas' ) | crontab -
#
# A credencial vem do instance profile; nao ha chave em lugar nenhum. A
# permissao cloudwatch:PutMetricData esta na role controlog-ec2-ssm, definida em
# infra/cicd.yml.

set -euo pipefail

NAMESPACE='Controlog/Instancia'
REGIAO="${AWS_REGION:-us-east-1}"

# IMDSv2: o token e obrigatorio. Sem ele a instancia responde 401, e o sintoma
# seria metrica publicada sem dimensao, que nao casa com nenhum alarme.
token=$(curl -sS -X PUT 'http://169.254.169.254/latest/api/token' \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' --max-time 5)

id_da_instancia=$(curl -sS -H "X-aws-ec2-metadata-token: $token" \
  --max-time 5 'http://169.254.169.254/latest/meta-data/instance-id')

if [ -z "$id_da_instancia" ]; then
  echo 'metricas: nao foi possivel obter o id da instancia' >&2
  exit 1
fi

# /proc/meminfo em kB. MemAvailable e o numero certo, e nao MemFree: o Linux usa
# a memoria livre como cache de pagina, entao MemFree fica proximo de zero numa
# maquina saudavel e produziria alarme permanente.
leia_meminfo() {
  awk -v chave="$1" '$1 == chave":" { print $2; exit }' /proc/meminfo
}

mem_total=$(leia_meminfo MemTotal)
mem_disponivel=$(leia_meminfo MemAvailable)
swap_total=$(leia_meminfo SwapTotal)
swap_livre=$(leia_meminfo SwapFree)

mem_percentual=$(awk -v t="$mem_total" -v d="$mem_disponivel" \
  'BEGIN { if (t > 0) printf "%.2f", (t - d) * 100 / t; else print "0" }')

# Swap pode nao existir; dividir por zero produziria "nan", que o PutMetricData
# recusa e que derrubaria o script inteiro por causa do set -e.
swap_percentual=$(awk -v t="$swap_total" -v l="$swap_livre" \
  'BEGIN { if (t > 0) printf "%.2f", (t - l) * 100 / t; else print "0" }')

# Particao raiz, que e onde moram as imagens Docker e o volume de comprovantes.
disco_percentual=$(df --output=pcent / | tail -1 | tr -d ' %')

aws cloudwatch put-metric-data \
  --region "$REGIAO" \
  --namespace "$NAMESPACE" \
  --metric-data \
    "MetricName=MemoriaUtilizadaPercentual,Value=$mem_percentual,Unit=Percent,Dimensions=InstanceId=$id_da_instancia" \
    "MetricName=SwapUtilizadoPercentual,Value=$swap_percentual,Unit=Percent,Dimensions=InstanceId=$id_da_instancia" \
    "MetricName=DiscoUtilizadoPercentual,Value=$disco_percentual,Unit=Percent,Dimensions=InstanceId=$id_da_instancia"

echo "metricas publicadas: memoria ${mem_percentual}%, swap ${swap_percentual}%, disco ${disco_percentual}%"
