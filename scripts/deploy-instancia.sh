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

LOG=/tmp/controlog-deploy.log
COMPOSE=(docker compose -f docker-compose.prod.yml -f docker-compose.https.yml --env-file .env.production)

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
  echo "==> conferindo https://${DOMINIO}/health"
  curl -fsS --max-time 20 "https://${DOMINIO}/health" >/dev/null \
    || falhar "a aplicacao nao respondeu em https://${DOMINIO}/health"
fi

echo "==> limpando imagens e cache orfaos"
docker image prune -af >/dev/null 2>&1 || true
docker builder prune -af >/dev/null 2>&1 || true

echo "OK: deploy concluido, $(df -Ph / | awk 'NR==2 {print $4}') livres em disco"
