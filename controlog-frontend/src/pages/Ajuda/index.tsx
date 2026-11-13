import { useMemo, useState } from 'react'
import { ChevronDown, LifeBuoy, Search } from 'lucide-react'
import { PERGUNTAS, type Pergunta } from './perguntas'
import { useAuthStore } from '@/stores/authStore'

/**
 * Central de ajuda.
 *
 * Tudo em memória, sem chamada de API: o conteúdo é a documentação do próprio
 * sistema, e quem abre esta tela pode estar justamente com algo quebrado —
 * depender do servidor para explicar um erro do servidor é a pior hora para
 * descobrir que a ajuda também não carrega.
 */

function normalizar(texto: string): string {
  // Sem acento e em minúscula: quem digita "entrega nao concluida" na busca
  // espera achar "entrega não concluída".
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function casa(pergunta: Pergunta, busca: string): boolean {
  if (!busca.trim()) return true
  const alvo = normalizar(
    [pergunta.pergunta, pergunta.categoria, ...pergunta.resposta].join(' ')
  )
  // Todos os termos precisam aparecer, em qualquer ordem.
  return normalizar(busca)
    .split(/\s+/)
    .filter(Boolean)
    .every((termo) => alvo.includes(termo))
}

export default function Ajuda() {
  const perfil = useAuthStore((s) => s.usuario?.perfil) ?? 'OPERADOR'
  const [busca, setBusca] = useState('')
  const [abertas, setAbertas] = useState<Set<string>>(new Set())

  const visiveis = useMemo(
    () => PERGUNTAS.filter((p) => p.perfis.includes(perfil) && casa(p, busca)),
    [perfil, busca]
  )

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, Pergunta[]>()
    for (const p of visiveis) {
      const atual = mapa.get(p.categoria) ?? []
      atual.push(p)
      mapa.set(p.categoria, atual)
    }
    return [...mapa.entries()]
  }, [visiveis])

  function alternar(id: string) {
    setAbertas((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <LifeBuoy size={20} className="text-blue-600" />
          Central de ajuda
        </h1>
        <p className="text-sm text-gray-600">
          Dúvidas frequentes sobre o uso do Controlog, respondidas pelas regras que o
          sistema realmente aplica.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <label htmlFor="ajuda-busca" className="sr-only">
          Buscar nas perguntas frequentes
        </label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="ajuda-busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por palavra: comprovante, senha, motorista..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {porCategoria.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-sm text-gray-600">
          Nenhuma pergunta corresponde a “{busca}”. Tente uma palavra mais curta, ou
          fale com o suporte abaixo.
        </div>
      ) : (
        porCategoria.map(([categoria, perguntas]) => (
          <section key={categoria} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <h2 className="px-5 py-3 border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
              {categoria}
            </h2>
            <ul className="divide-y divide-gray-100">
              {perguntas.map((p) => {
                const aberta = abertas.has(p.id)
                return (
                  <li key={p.id}>
                    <h3>
                      <button
                        type="button"
                        onClick={() => alternar(p.id)}
                        aria-expanded={aberta}
                        aria-controls={`resposta-${p.id}`}
                        className="w-full flex items-start justify-between gap-3 text-left px-5 py-3.5 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-800">{p.pergunta}</span>
                        <ChevronDown
                          size={17}
                          aria-hidden="true"
                          className={`shrink-0 mt-0.5 text-gray-400 transition-transform ${aberta ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </h3>
                    {/* hidden em vez de desmontar: o conteúdo segue no DOM,
                        então a busca do navegador (Ctrl+F) acha texto de
                        resposta fechada. */}
                    <div id={`resposta-${p.id}`} hidden={!aberta} className="px-5 pb-4 -mt-1">
                      {p.resposta.map((paragrafo, i) => (
                        <p key={i} className="text-sm leading-relaxed text-gray-600 mt-2">
                          {paragrafo}
                        </p>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}

      <section className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800">Não achou a resposta?</h2>
        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
          Fale com quem administra o Controlog na sua operação. Ao relatar um problema,
          ajuda muito informar: em que tela aconteceu, o que você tentou fazer, a
          mensagem exata que apareceu e o código do registro envolvido (a rota RT-XXX ou
          a entrega EN-XXX).
        </p>
        <p className="text-xs text-gray-500 mt-3">
          Versão {APP_VERSION}. Informe-a ao relatar um problema — ela diz exatamente
          qual build você estava usando.
        </p>
      </section>
    </div>
  )
}
