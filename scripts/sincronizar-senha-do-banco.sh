#!/usr/bin/env bash
#
# Mantem a senha do banco no .env.production igual a do Secrets Manager.
#
# Existe por causa de um incidente concreto. O RDS usa senha mestra gerenciada
# pela AWS, com rotacao automatica a cada 7 dias. Em 16/11/2026 a rotacao
# correu as 05:15 UTC, a credencial do .env.production ficou velha, e por cinco
# horas todo acesso ao banco respondeu 500 — login incluido. Sem este script, o
# mesmo acontece a cada sete dias.
#
# Executado por timer do systemd a cada minuto. Quando a senha nao
# mudou, nao faz nada; quando mudou, reescreve o .env.production e recria so o
# conteiner da api. O pior caso e o site ficar sem banco os minutos entre a
# rotacao e o proximo tique.
#
# Instalacao, na instancia:
#   sudo install -m 755 scripts/sincronizar-senha-do-banco.sh /usr/local/bin/controlog-senha-banco
#   sudo install -m 644 infra/systemd/controlog-senha-banco.{service,timer} /etc/systemd/system/
#   sudo systemctl daemon-reload && sudo systemctl enable --now controlog-senha-banco.timer
#
# A credencial de AWS vem do instance profile; a permissao esta na role
# controlog-ec2-ssm, em infra/cicd.yml, restrita aos segredos `rds!db-*`.
#
# O script nunca imprime a senha, nem a passa por linha de comando (que seria
# visivel em `ps`). Ela trafega por variavel de shell e por stdin.

set -euo pipefail

# Diretorio do projeto por caminho configuravel, e NAO derivado de
# $BASH_SOURCE. Este script e instalado em /usr/local/bin, e dali
# `dirname $BASH_SOURCE`/.. resolve para /usr/local — onde nao existe
# .env.production. O script falhava com "nao existe neste diretorio" tanto na
# execucao manual quanto sob o systemd, porque o `cd` sobrepunha o
# WorkingDirectory da unidade.
#
# Rodando a partir do proprio repositorio, o caminho padrao continua valendo.
DIRETORIO_PROJETO="${CONTROLOG_DIR:-/home/ec2-user/controlog}"

if [[ ! -d "$DIRETORIO_PROJETO" ]]; then
  echo "FALHOU: diretorio do projeto nao encontrado em $DIRETORIO_PROJETO."
  echo 'Defina CONTROLOG_DIR se o projeto estiver em outro lugar.'
  exit 1
fi

cd "$DIRETORIO_PROJETO"

REGIAO="${AWS_REGION:-us-east-1}"
ENV_ARQUIVO=.env.production
ID_DO_BANCO="${CONTROLOG_DB_ID:-controlog-db}"

if [[ ! -f "$ENV_ARQUIVO" ]]; then
  echo "FALHOU: $ENV_ARQUIVO nao existe em $DIRETORIO_PROJETO."
  exit 1
fi

for comando in aws python3 flock; do
  command -v "$comando" >/dev/null 2>&1 || {
    echo "FALHOU: $comando nao encontrado."
    exit 1
  }
done

# ARN descoberto a partir da instancia de banco, em vez de fixo em arquivo: o
# ARN de segredo gerenciado pelo RDS termina num sufixo aleatorio, e ele muda se
# o banco for recriado.
ARN_DO_SEGREDO=$(
  aws rds describe-db-instances \
    --region "$REGIAO" \
    --db-instance-identifier "$ID_DO_BANCO" \
    --query 'DBInstances[0].MasterUserSecret.SecretArn' \
    --output text
)

if [[ -z "$ARN_DO_SEGREDO" || "$ARN_DO_SEGREDO" == 'None' ]]; then
  echo "FALHOU: o banco $ID_DO_BANCO nao usa senha mestra gerenciada pela AWS."
  echo 'Se a senha passou a ser gerenciada a mao, este script deixou de ter funcao.'
  exit 1
fi

SEGREDO=$(
  aws secretsmanager get-secret-value \
    --region "$REGIAO" \
    --secret-id "$ARN_DO_SEGREDO" \
    --query SecretString \
    --output text
)

# A mesma trava do deploy, de proposito. Recriar o conteiner da api enquanto um
# deploy constroi imagens e exatamente a corrida que derrubou a producao por 25
# horas. Com -n, se houver deploy em andamento este tique desiste e o proximo,
# em um minuto, tenta de novo.
#
# Tomada AQUI, e nao no inicio do script, por causa de um deploy reprovado de
# verdade em 16/11/2026: `FALHOU: ja existe um deploy em andamento nesta
# instancia`, com o deploy perdendo a trava para este script. Quase todo o
# tempo de execucao de um tique esta nas duas chamadas a AWS acima — cerca de
# 2 s de parede, para ~50 ms de reescrita — e nenhuma delas toca em conteiner
# ou arquivo, logo nenhuma precisa de exclusao mutua. Segurando a trava do
# inicio ao fim, este script a ocupava ~2 s por minuto depois da 1.11.6, ou
# seja ~3% do tempo; dali para frente ela so e ocupada quando a senha mudou
# de fato, uma vez por semana.
exec {FD_TRAVA}>/tmp/controlog-deploy.lock
if ! flock -n "$FD_TRAVA"; then
  echo 'deploy em andamento; pulando esta verificacao.'
  exit 0
fi

# O Python faz a troca inteira: le o segredo do stdin, reescreve as duas URLs do
# arquivo preservando host, porta, base e parametros, e imprime apenas
# "alterado" ou "inalterado". A senha nao sai daqui.
#
# Em Python, e nao em sed, por causa da codificacao: senha gerada pela AWS tem
# caracteres como / @ # % ? que precisam ser percent-encoded para a URL do
# Prisma, e escapar isso em sed e fonte garantida de erro silencioso.
RESULTADO=$(
  printf '%s' "$SEGREDO" | CONTROLOG_ENV_ARQUIVO="$ENV_ARQUIVO" python3 -c '
import json, os, re, sys
from urllib.parse import quote

segredo = json.load(sys.stdin)
senha = quote(segredo["password"], safe="")
usuario = quote(segredo["username"], safe="")

caminho = os.environ["CONTROLOG_ENV_ARQUIVO"]
with open(caminho, encoding="utf-8") as f:
    original = f.read()

# Casa `postgresql://usuario:senha@resto` nas duas variaveis, trocando apenas
# usuario e senha. Nao-guloso no `[^:]*` e `[^@]*` para parar na primeira
# ocorrencia.
padrao = re.compile(
    r"^(?P<chave>DATABASE_URL|DIRECT_URL)(?P<meio>\s*=\s*\"?)postgresql://"
    r"(?P<usuario>[^:@/]*):(?P<senha>[^@]*)@(?P<resto>[^\"\s]*)",
    re.MULTILINE,
)

achou = 0

def troca(m):
    # Grupos extraidos para variaveis antes da f-string: aspas dentro das
    # chaves de uma f-string nao sao aceitas aqui, porque este Python inteiro
    # esta entre aspas simples no shell.
    global achou
    achou += 1
    chave = m.group("chave")
    meio = m.group("meio")
    resto = m.group("resto")
    return f"{chave}{meio}postgresql://{usuario}:{senha}@{resto}"

novo = padrao.sub(troca, original)

if achou != 2:
    print(f"erro: esperava 2 URLs de banco no arquivo, encontrei {achou}", file=sys.stderr)
    sys.exit(2)

if novo == original:
    print("inalterado")
    sys.exit(0)

# Escreve por arquivo temporario no mesmo diretorio e troca por rename, que e
# atomico: se a maquina cair no meio, o .env.production nao fica truncado.
temporario = caminho + ".novo"
with open(temporario, "w", encoding="utf-8") as f:
    f.write(novo)
os.chmod(temporario, 0o600)
os.replace(temporario, caminho)
print("alterado")
'
)

if [[ "$RESULTADO" == 'inalterado' ]]; then
  echo 'senha do banco inalterada.'
  exit 0
fi

echo 'senha do banco mudou no Secrets Manager; recriando a api.'

ARQUIVOS=(-f docker-compose.prod.yml -f docker-compose.https.yml)
if grep -qE '^CONTROLOG_LOGS_CLOUDWATCH=1[[:space:]]*$' "$ENV_ARQUIVO"; then
  ARQUIVOS+=(-f docker-compose.logs.yml)
fi

docker compose "${ARQUIVOS[@]}" --env-file "$ENV_ARQUIVO" up -d --force-recreate api

# Em seguida, um `up -d` da pilha inteira. No caso normal — site no ar, senha
# rotacionada — nao faz nada, porque web e caddy ja estao rodando. Mas se a
# senha velha tiver impedido o `api` de subir num deploy anterior, `web` e
# `caddy` ficaram parados tambem, por dependerem dele: sem esta linha o script
# consertaria a senha e deixaria o site fora do ar.
docker compose "${ARQUIVOS[@]}" --env-file "$ENV_ARQUIVO" up -d

# Confirma que a api voltou a falar com o banco. Sem esta checagem, o script
# diria "pronto" mesmo tendo escrito uma senha que nao funciona.
#
# Pelo dominio em HTTPS, e nao por http://127.0.0.1: a porta 80 da instancia e
# o Caddy, que responde 308 redirecionando para HTTPS — o curl aceitaria o 308
# sem erro e a checagem passaria sem nunca ter falado com a API.
DOMINIO=$(grep -m1 '^CONTROLOG_DOMAIN=' "$ENV_ARQUIVO" | cut -d= -f2-)
DOMINIO="${DOMINIO//\"/}"
DOMINIO="${DOMINIO//\'/}"
DOMINIO="${DOMINIO//[[:space:]]/}"

if [[ -z "$DOMINIO" ]]; then
  echo 'api recriada; sem CONTROLOG_DOMAIN no .env, nao foi possivel conferir /health/db.'
  exit 0
fi

for _ in $(seq 1 30); do
  # Confere o CORPO e nao so o codigo: se a rota cair no fallback da SPA, a
  # resposta e o index.html com 200, e a checagem passaria sem ter consultado
  # o banco.
  RESPOSTA=$(curl -fsS --max-time 5 "https://${DOMINIO}/health/db" 2>/dev/null || true)
  case "$RESPOSTA" in
    *'"banco":"ok"'*)
      echo 'api recriada e com o banco acessivel.'
      exit 0
      ;;
  esac
  sleep 2
done

echo 'FALHOU: a api subiu mas /health/db nao confirmou o banco acessivel.'
exit 1
