#!/usr/bin/env node
/*
 * Sobe o Controlog inteiro com um comando só: banco, API e interface.
 *
 * Sem dependências de propósito. A raiz do repositório não tem node_modules,
 * e manter assim evita que `npm install` na raiz passe a ser mais um passo —
 * e que a Vercel tenha um package.json instalável a mais para interpretar nos
 * builds, que já deram trabalho neste projeto.
 */
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import net from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BACKEND = join(RAIZ, 'controlog-backend')
const FRONTEND = join(RAIZ, 'controlog-frontend')

const NO_WINDOWS = process.platform === 'win32'
const CORES = process.stdout.isTTY && !process.env.NO_COLOR

const cor = (codigo, texto) => (CORES ? `\u001b[${codigo}m${texto}\u001b[0m` : texto)
const azul = (t) => cor('36', t)
const verde = (t) => cor('32', t)
const amarelo = (t) => cor('33', t)
const vermelho = (t) => cor('31', t)
const fraco = (t) => cor('90', t)

const semBanco = process.argv.includes('--sem-banco')

function aviso(texto) {
  console.log(`${fraco('[dev]')} ${texto}`)
}

function abortar(titulo, ...dicas) {
  console.error(`\n${vermelho('✖')} ${titulo}`)
  for (const dica of dicas) console.error(`  ${dica}`)
  console.error('')
  process.exit(1)
}

/*
 * Todo comando daqui vai como uma string única, e não como (comando, [args]).
 *
 * shell: true é obrigatório no Windows desde o Node 20.12 para chamar .cmd
 * (npm, npx) — sem ele o spawn falha com EINVAL. Só que shell: true junto de
 * um array de argumentos faz o Node emitir DEP0190 a cada processo iniciado,
 * porque os argumentos são concatenados sem escape. Como nenhum comando aqui
 * leva entrada de fora, a string única é equivalente e não polui a saída.
 */

/** Roda um comando até o fim, herdando o terminal. Devolve o código de saída. */
function rodar(comando, cwd, { silencioso = false } = {}) {
  const resultado = spawnSync(comando, {
    cwd,
    shell: true,
    stdio: silencioso ? 'ignore' : 'inherit',
  })
  return resultado.status ?? 1
}

/** Só interessa se o comando funcionou; a saída é descartada. */
function funciona(comando) {
  return spawnSync(comando, { shell: true, stdio: 'ignore' }).status === 0
}

// ─── 1. Arquivos de ambiente ──────────────────────────────────────────────

function garantirEnv(pasta, nome) {
  const env = join(pasta, '.env')
  const exemplo = join(pasta, '.env.example')
  if (existsSync(env)) return

  if (!existsSync(exemplo)) {
    abortar(
      `${nome} não tem .env nem .env.example.`,
      'Esperado em: ' + env
    )
  }
  copyFileSync(exemplo, env)
  aviso(`${nome}: .env criado a partir do .env.example.`)
}

// ─── 2. Dependências ──────────────────────────────────────────────────────

function garantirDependencias(pasta, nome) {
  if (existsSync(join(pasta, 'node_modules'))) return

  aviso(`${nome}: instalando dependências (primeira execução, pode demorar)...`)
  if (rodar('npm install', pasta) !== 0) {
    abortar(`Falha ao instalar as dependências do ${nome}.`)
  }
}

// ─── 3. Banco de dados ────────────────────────────────────────────────────

/** Host e porta do DATABASE_URL do backend. */
function enderecoDoBanco() {
  const conteudo = readFileSync(join(BACKEND, '.env'), 'utf8')
  const linha = conteudo.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m)
  if (!linha) return null

  try {
    const url = new URL(linha[1])
    return { host: url.hostname, porta: Number(url.port || 5432) }
  } catch {
    return null
  }
}

function portaAberta({ host, porta }, timeout = 1500) {
  return new Promise((resolver) => {
    const socket = new net.Socket()
    const encerrar = (aberta) => {
      socket.destroy()
      resolver(aberta)
    }
    socket.setTimeout(timeout)
    socket.once('connect', () => encerrar(true))
    socket.once('timeout', () => encerrar(false))
    socket.once('error', () => encerrar(false))
    socket.connect(porta, host)
  })
}

/*
 * `docker compose version` responde mesmo com o Docker Desktop fechado — é só
 * a CLI. `docker info` é que fala com o daemon, então é ele quem distingue
 * "Docker não instalado" de "Docker instalado, mas desligado".
 */
function estadoDoDocker() {
  if (!funciona('docker --version')) {
    return 'ausente'
  }
  if (!funciona('docker info')) {
    return 'parado'
  }
  return 'pronto'
}

async function garantirBanco() {
  const endereco = enderecoDoBanco()
  if (!endereco) {
    abortar(
      'Não consegui ler o DATABASE_URL de controlog-backend/.env.',
      'Confira a variável, ou rode com --sem-banco para pular esta checagem.'
    )
  }

  if (await portaAberta(endereco)) {
    aviso(`banco já de pé em ${endereco.host}:${endereco.porta}.`)
    return
  }

  // Banco remoto (Neon, por exemplo) não é coisa que este script suba.
  const local = ['localhost', '127.0.0.1', '::1'].includes(endereco.host)
  if (!local) {
    abortar(
      `Não alcancei o banco em ${endereco.host}:${endereco.porta}.`,
      'O DATABASE_URL aponta para um banco remoto — confira a conexão e as credenciais.'
    )
  }

  const docker = estadoDoDocker()
  const ajusteDoEnv = `Se você já tem um PostgreSQL rodando em outro lugar, ajuste o DATABASE_URL em ${join('controlog-backend', '.env')}.`

  if (docker === 'parado') {
    abortar(
      `Nada ouvindo em ${endereco.host}:${endereco.porta}, e o Docker Desktop está fechado.`,
      'Abra o Docker Desktop, espere o ícone ficar verde e rode de novo.',
      ajusteDoEnv
    )
  }
  if (docker === 'ausente') {
    abortar(
      `Nada ouvindo em ${endereco.host}:${endereco.porta}, e o Docker não está instalado.`,
      'Instale o Docker Desktop (https://docs.docker.com/desktop/) ou suba um PostgreSQL próprio nessa porta.',
      ajusteDoEnv
    )
  }

  aviso('subindo o PostgreSQL com o Docker Compose...')
  // --wait segura até o healthcheck do compose passar: sem isso o Prisma
  // tentaria migrar contra um Postgres que ainda está inicializando.
  if (rodar('docker compose up -d --wait', BACKEND) !== 0) {
    abortar(
      'O Docker Compose não conseguiu subir o banco.',
      'Veja o erro acima. Se o Docker Desktop acabou de abrir, espere alguns segundos e tente de novo.'
    )
  }
}

function prepararPrisma() {
  aviso('aplicando as migrations pendentes...')
  if (rodar('npx prisma migrate deploy', BACKEND) !== 0) {
    abortar(
      'As migrations não foram aplicadas.',
      'Veja o erro acima — normalmente é o banco inacessível ou um DATABASE_URL errado.'
    )
  }
  // generate é rápido e idempotente; roda sempre para o Prisma Client não
  // ficar defasado em relação ao schema depois de um git pull.
  rodar('npx prisma generate', BACKEND, { silencioso: true })
}

// ─── 4. Os dois servidores ────────────────────────────────────────────────

const filhos = []
let encerrando = false

/** Mata o processo e seus descendentes — no Windows, npm.cmd gera uma árvore. */
function matarArvore(filho) {
  if (filho.exitCode !== null || filho.signalCode !== null) return
  if (NO_WINDOWS) {
    spawnSync('taskkill /pid ' + filho.pid + ' /t /f', { shell: true, stdio: 'ignore' })
  } else {
    filho.kill('SIGTERM')
  }
}

function encerrarTudo(codigo) {
  if (encerrando) return
  encerrando = true
  for (const { processo } of filhos) matarArvore(processo)
  process.exit(codigo)
}

/** Repassa a saída linha a linha, com o prefixo de quem falou. */
function encaminhar(fluxo, prefixo, destino) {
  let resto = ''
  fluxo.setEncoding('utf8')
  fluxo.on('data', (pedaco) => {
    const linhas = (resto + pedaco).split('\n')
    resto = linhas.pop() ?? ''
    for (const linha of linhas) destino.write(`${prefixo} ${linha}\n`)
  })
  fluxo.on('end', () => {
    if (resto) destino.write(`${prefixo} ${resto}\n`)
  })
}

function iniciar(nome, prefixo, cwd) {
  const processo = spawn('npm run dev', { cwd, shell: true, stdio: 'pipe' })
  encaminhar(processo.stdout, prefixo, process.stdout)
  encaminhar(processo.stderr, prefixo, process.stderr)

  processo.on('exit', (codigo, sinal) => {
    if (encerrando) return

    // Ctrl+C chega aos filhos junto com o pai, então a saída deles é
    // consequência do pedido de parada, não uma queda a anunciar. Com
    // shell: true quem sai é o shell, com 128+sinal, e não o processo
    // sinalizado — daí os códigos 130 (SIGINT) e 143 (SIGTERM) aqui.
    if (sinal !== null || codigo === 130 || codigo === 143) {
      encerrarTudo(0)
      return
    }

    console.log(`\n${amarelo('!')} ${nome} encerrou (código ${codigo ?? 0}). Derrubando o resto.`)
    encerrarTudo(codigo ?? 0)
  })

  filhos.push({ nome, processo })
}

// ─── Execução ─────────────────────────────────────────────────────────────

async function main() {
  garantirEnv(BACKEND, 'backend')
  garantirEnv(FRONTEND, 'frontend')
  garantirDependencias(BACKEND, 'backend')
  garantirDependencias(FRONTEND, 'frontend')

  if (semBanco) {
    aviso('--sem-banco: pulando Docker e migrations.')
  } else {
    await garantirBanco()
    prepararPrisma()
  }

  console.log('')
  console.log(`  ${verde('API')}       http://localhost:3333`)
  console.log(`  ${verde('Interface')} http://localhost:5173`)
  console.log(`  ${fraco('Logins do seed: gestor@controlog.com / motorista@controlog.com (senha controlog123)')}`)
  console.log(`  ${fraco('Ctrl+C derruba os dois.')}`)
  console.log('')

  iniciar('backend', azul('[api] '), BACKEND)
  iniciar('frontend', verde('[web] '), FRONTEND)
}

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => encerrarTudo(0))
}

main().catch((erro) => {
  console.error(erro)
  encerrarTudo(1)
})
