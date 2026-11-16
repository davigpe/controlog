#!/usr/bin/env bash
#
# Publica, na instancia, a versao que ja esta no diretorio de trabalho.
#
# Quem chama isto e o workflow de deploy, por SSM, depois de dar o git pull.
# O pull fica fora deste arquivo de proposito: se ele estivesse aqui, o script
# em execucao seria sempre o da versao anterior, e uma correcao feita no
# proprio script so valeria no deploy seguinte.
#
# Pode ser rodado a mao tambem, por SSH, quando for preciso:
#
#   cd ~/controlog && git pull --ff-only origin main && bash scripts/deploy-instancia.sh
#
# A saida e curta de proposito: o SSM trunca o resultado em 2500 caracteres, e
# o log de um build do Docker passa disso com folga. O detalhe vai para um
# arquivo, e so aparece se algo falhar.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Exclusao mutua. Nao e precaucao teorica: duas execucoes simultaneas — uma a
# mao por SSH e a do CI por SSM — derrubaram a producao por cerca de 25 horas.
# Elas disputaram os mesmos conteineres (uma parou o `web`, a outra nao
# conseguiu subir, e o Caddy ficou devolvendo 502) e sobrescreveram este mesmo
# arquivo de log, o que destruiu a evidencia: o log mostrava um build de outra
# versao, nao o erro de quem falhou.
#
# O `concurrency` do workflow nao cobre isto. Ele impede dois deploys do
# GitHub Actions, e nao ve nada que rode na mao na instancia.
#
# -n em vez de espera: um deploy que ficasse pendurado atras de outro
# estouraria o tempo do SSM e reprovaria do mesmo jeito, so mais devagar e sem
# dizer por que. Recusar na hora, dizendo o motivo, e mais util.
# Em /tmp, e nao em /var/lock: na Amazon Linux 2023 o /var/lock pertence ao
# root, e este script roda como ec2-user — a trava falharia na criacao do
# arquivo e reprovaria todo deploy.
TRAVA=/tmp/controlog-deploy.lock

if ! command -v flock >/dev/null 2>&1; then
  echo 'FALHOU: flock nao encontrado (pacote util-linux).'
  echo 'Sem ele nao ha protecao contra dois deploys simultaneos, que e o que'
  echo 'derrubou a producao antes. Instale com: sudo dnf install -y util-linux'
  exit 1
fi

exec {FD_TRAVA}>"$TRAVA"
if ! flock -n "$FD_TRAVA"; then
  echo 'FALHOU: ja existe um deploy em andamento nesta instancia.'
  echo 'Espere ele terminar. Rodar dois ao mesmo tempo derruba o site.'
  exit 1
fi

LOG=/tmp/controlog-deploy.log
ARQUIVOS=(-f docker-compose.prod.yml -f docker-compose.https.yml)

# Envio de log para o CloudWatch, opt-in por variavel no .env.production. Fica
# numa sobreposicao separada porque o driver awslogs impede o contêiner de subir
# quando o grupo de log nao existe: ligado por engano num ambiente sem a stack
# de observabilidade, derrubaria o deploy.
if [[ -f .env.production ]] && grep -qE '^CONTROLOG_LOGS_CLOUDWATCH=1[[:space:]]*$' .env.production; then
  ARQUIVOS+=(-f docker-compose.logs.yml)
  echo '==> log da API sera enviado ao CloudWatch'
fi

COMPOSE=(docker compose "${ARQUIVOS[@]}" --env-file .env.production)

falhar() {
  echo "FALHOU: $1"
  if [[ -f "$LOG" ]]; then
    echo "--- ultimas 40 linhas do log ---"
    tail -40 "$LOG"
  fi
  exit 1
}

echo "==> versao: $(git log --oneline -1)"

if [[ ! -f .env.production ]]; then
  falhar ".env.production nao existe. Ele vive so na instancia e nunca vai para o Git."
fi

# O build do Vite dentro do contentor e o que mais consome disco aqui. Sem esta
# checagem, um disco cheio aparece como um erro obscuro do Docker no meio do
# build, em vez de uma mensagem que diz o que fazer.
LIVRE_MB=$(df -Pm / | awk 'NR==2 {print $4}')
if (( LIVRE_MB < 1500 )); then
  echo "Pouco espaco em disco (${LIVRE_MB} MB). Limpando cache antes do build."
  docker builder prune -af >/dev/null 2>&1 || true
  docker image prune -af >/dev/null 2>&1 || true
  LIVRE_MB=$(df -Pm / | awk 'NR==2 {print $4}')
  (( LIVRE_MB >= 1000 )) || falhar "Ainda sem espaco apos a limpeza (${LIVRE_MB} MB)."
fi

echo "==> build e subida"
"${COMPOSE[@]}" up -d --build >"$LOG" 2>&1 || falhar "o build ou a subida retornou erro"

echo "==> esperando api e web ficarem saudaveis"
for _ in $(seq 1 60); do
  ESTADOS=$("${COMPOSE[@]}" ps --format '{{.Service}}:{{.Health}}' 2>/dev/null || true)
  API=$(echo "$ESTADOS" | awk -F: '$1=="api" {print $2}')
  WEB=$(echo "$ESTADOS" | awk -F: '$1=="web" {print $2}')
  [[ "$API" == "healthy" && "$WEB" == "healthy" ]] && break
  sleep 5
done
[[ "${API:-}" == "healthy" && "${WEB:-}" == "healthy" ]] \
  || falhar "api=${API:-ausente} web=${WEB:-ausente} nao ficaram saudaveis a tempo"

# Verificacao pela porta publica, nao pelo localhost: e o caminho que o usuario
# percorre, incluindo o Caddy, o TLS e o nginx. Um contentor saudavel com o
# proxy quebrado passaria despercebido numa checagem interna.
DOMINIO=$(grep -m1 '^CONTROLOG_DOMAIN=' .env.production | cut -d= -f2-)
DOMINIO="${DOMINIO//\"/}"      # o valor vem entre aspas no .env
DOMINIO="${DOMINIO//\'/}"
DOMINIO="${DOMINIO//[[:space:]]/}"
if [[ -n "$DOMINIO" ]]; then
  # /health/db e nao /health: o primeiro consulta o banco, o segundo so prova
  # que o processo subiu. Um deploy que publica uma aplicacao incapaz de falar
  # com o banco nao deve passar — foi assim que a rotacao da senha do RDS ficou
  # cinco horas sem ser notada.
  # Confere o CORPO, e nao so o codigo. Com `location = /health` no nginx, o
  # caminho /health/db nao casava regra nenhuma, caia no try_files e recebia o
  # index.html da SPA com 200 — a verificacao passava sem a API ter sido
  # consultada. Exigir "banco":"ok" fecha esse falso positivo: HTML nao casa.
  echo "==> conferindo https://${DOMINIO}/health/db"
  RESPOSTA=$(curl -fsS --max-time 20 "https://${DOMINIO}/health/db" 2>/dev/null) \
    || falhar "a aplicacao nao respondeu em https://${DOMINIO}/health/db"
  case "$RESPOSTA" in
    *'"banco":"ok"'*) : ;;
    *) falhar "https://${DOMINIO}/health/db respondeu sem \"banco\":\"ok\" — banco inacessivel, ou a rota caiu no fallback da SPA" ;;
  esac
fi

echo "==> limpando imagens e cache orfaos"
docker image prune -af >/dev/null 2>&1 || true
docker builder prune -af >/dev/null 2>&1 || true

echo "OK: deploy concluido, $(df -Ph / | awk 'NR==2 {print $4}') livres em disco"
