import { vi } from 'vitest'

/**
 * Captura o arquivo que a página mandaria o navegador baixar.
 *
 * A write-excel-file entrega o arquivo criando um object URL e clicando num
 * <a download>. Em teste, trocar o `URL.createObjectURL` é a única forma de
 * pôr a mão no Blob gerado — e sem isso nada verificaria que o .xlsx que o
 * sistema produz é um arquivo válido, só que a função foi chamada.
 */
export async function capturarDownload(acao: () => Promise<void>): Promise<Blob> {
  const blobs: Blob[] = []

  const criar = vi.fn((blob: Blob) => {
    blobs.push(blob)
    return 'blob:download-de-teste'
  })

  const urlOriginal = URL.createObjectURL
  const revokeOriginal = URL.revokeObjectURL
  // jsdom não implementa as duas, então são atribuídas em vez de espionadas.
  URL.createObjectURL = criar as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn()

  try {
    await acao()
  } finally {
    URL.createObjectURL = urlOriginal
    URL.revokeObjectURL = revokeOriginal
  }

  if (blobs.length !== 1) {
    throw new Error(`Esperava exatamente um download, houve ${blobs.length}.`)
  }
  return blobs[0]
}

/** O Blob baixado, embrulhado como File para voltar a um leitor de planilha. */
export function comoArquivo(blob: Blob, nome = 'baixado.xlsx'): File {
  return new File([blob], nome, { type: blob.type })
}
