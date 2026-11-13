import { useEffect, useRef, useState } from 'react'
import { Camera, FileText, Loader2, Paperclip, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import { baixarComprovante, useEnviarComprovante, useRemoverComprovante } from './api'
import type { Comprovante, EntregaDaRota } from './types'

const MAXIMO = 5

function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Anexos de uma entrega, com envio pela câmera ou pelo arquivo.
 *
 * As miniaturas das fotos recém-enviadas saem do próprio arquivo escolhido, e
 * não de uma nova requisição: o motorista precisa conferir na hora se a foto
 * ficou legível, e buscar de volta o que ele acabou de mandar gastaria dados
 * móveis à toa. Comprovantes que já estavam lá abrem sob demanda, ao toque.
 */
export default function ComprovantesEntrega({
  entrega,
  podeEditar,
}: {
  entrega: EntregaDaRota
  podeEditar: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const enviar = useEnviarComprovante()
  const remover = useRemoverComprovante()

  // id do comprovante -> URL local da imagem que acabou de ser enviada.
  const [previas, setPrevias] = useState<Record<string, string>>({})
  const [visualizando, setVisualizando] = useState<{ url: string; comprovante: Comprovante } | null>(null)
  const [abrindo, setAbrindo] = useState<string | null>(null)

  // Object URLs seguram o arquivo na memória até serem revogadas.
  useEffect(() => {
    return () => {
      Object.values(previas).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previas])

  const comprovantes = entrega.comprovantes ?? []
  const cheio = comprovantes.length >= MAXIMO

  async function handleArquivo(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0]
    // Limpa já: sem isto, escolher o mesmo arquivo duas vezes seguidas não
    // dispara o change de novo, e o motorista acha que o botão travou.
    event.target.value = ''
    if (!arquivo) return

    try {
      const criado = await enviar.mutateAsync({ entregaId: entrega.id, arquivo })
      if (arquivo.type.startsWith('image/')) {
        setPrevias((atual) => ({ ...atual, [criado.id]: URL.createObjectURL(arquivo) }))
      }
      toast.success('Comprovante anexado.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível anexar o comprovante.'))
    }
  }

  async function handleRemover(comprovante: Comprovante) {
    try {
      await remover.mutateAsync(comprovante.id)
      setPrevias((atual) => {
        const { [comprovante.id]: url, ...resto } = atual
        if (url) URL.revokeObjectURL(url)
        return resto
      })
      toast.success('Comprovante removido.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível remover o comprovante.'))
    }
  }

  async function handleVisualizar(comprovante: Comprovante) {
    const previa = previas[comprovante.id]
    if (previa) {
      setVisualizando({ url: previa, comprovante })
      return
    }
    setAbrindo(comprovante.id)
    try {
      const url = await baixarComprovante(comprovante.id)
      setVisualizando({ url, comprovante })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível abrir o comprovante.'))
    } finally {
      setAbrindo(null)
    }
  }

  function fecharVisualizacao() {
    // Só revoga o que foi criado aqui; as prévias são revogadas no unmount.
    if (visualizando && !Object.values(previas).includes(visualizando.url)) {
      URL.revokeObjectURL(visualizando.url)
    }
    setVisualizando(null)
  }

  return (
    <div className="w-full">
      {comprovantes.length > 0 && (
        <ul className="flex flex-wrap gap-2 mb-2">
          {comprovantes.map((c) => {
            const ehImagem = c.mimeType.startsWith('image/')
            const previa = previas[c.id]
            return (
              <li key={c.id} className="relative">
                <button
                  type="button"
                  onClick={() => handleVisualizar(c)}
                  aria-label={`Ver comprovante ${c.nomeOriginal}`}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors max-w-[13rem]"
                >
                  {previa ? (
                    <img src={previa} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                  ) : (
                    <span className="w-9 h-9 rounded bg-white border border-gray-200 grid place-items-center shrink-0 text-gray-500">
                      {abrindo === c.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : ehImagem ? (
                        <Camera size={15} />
                      ) : (
                        <FileText size={15} />
                      )}
                    </span>
                  )}
                  <span className="min-w-0 text-left">
                    <span className="block text-xs font-medium text-gray-700 truncate">
                      {c.nomeOriginal}
                    </span>
                    <span className="block text-[11px] text-gray-500">{tamanhoLegivel(c.tamanho)}</span>
                  </span>
                </button>

                {podeEditar && (
                  <button
                    type="button"
                    onClick={() => handleRemover(c)}
                    disabled={remover.isPending}
                    aria-label={`Remover comprovante ${c.nomeOriginal}`}
                    // -top/-right e tamanho 28px: alvo de toque confortável num
                    // celular sem cobrir a miniatura.
                    className="absolute -top-2 -right-2 w-7 h-7 grid place-items-center rounded-full bg-white border border-gray-300 text-gray-500 shadow-sm hover:text-red-600 hover:border-red-300 disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {podeEditar && (
        <>
          <input
            ref={inputRef}
            type="file"
            // Sem `capture`: assim o celular oferece câmera E galeria. Forçar a
            // câmera impediria anexar um canhoto já fotografado antes.
            accept="image/*,application/pdf"
            onChange={handleArquivo}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviar.isPending || cheio}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-3 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-60 transition-colors"
          >
            {enviar.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Paperclip size={14} />
                {cheio ? `Máximo de ${MAXIMO} comprovantes` : 'Anexar comprovante'}
              </>
            )}
          </button>
        </>
      )}

      {visualizando && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={fecharVisualizacao}
          role="dialog"
          aria-modal="true"
          aria-label={`Comprovante ${visualizando.comprovante.nomeOriginal}`}
        >
          <button
            type="button"
            onClick={fecharVisualizacao}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-10 h-10 grid place-items-center rounded-full bg-white/90 text-gray-700"
          >
            <X size={18} />
          </button>
          {visualizando.comprovante.mimeType.startsWith('image/') ? (
            <img
              src={visualizando.url}
              alt={visualizando.comprovante.nomeOriginal}
              className="max-w-full max-h-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // PDF num iframe: o visualizador nativo do navegador dá zoom e
            // paginação de graça, e no celular abre em tela cheia.
            <iframe
              src={visualizando.url}
              title={visualizando.comprovante.nomeOriginal}
              className="w-full h-full bg-white rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  )
}
