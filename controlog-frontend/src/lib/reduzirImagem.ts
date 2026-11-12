/**
 * Reduz uma foto antes de enviá-la.
 *
 * Existe por causa do celular do motorista: a câmera de um aparelho atual
 * produz arquivos de 4 a 12 MB, que estourariam o limite do servidor e, pior,
 * levariam minutos para subir numa conexão móvel fraca — exatamente a situação
 * de quem está na rua terminando uma entrega.
 *
 * Um comprovante não precisa de resolução de impressão: o que importa é dar
 * para ler o endereço na etiqueta e reconhecer o volume. 1600px no lado maior,
 * em JPEG, resolve isso em algumas centenas de KB.
 *
 * PDF e HEIC passam sem tocar: o canvas não os decodifica. O limite do
 * servidor continua valendo como rede de segurança para esses casos.
 */

export const LADO_MAXIMO = 1600;
export const QUALIDADE_JPEG = 0.82;

/** Tipos que o navegador desenha em canvas de forma confiável. */
const REDUZIVEIS = ['image/jpeg', 'image/png', 'image/webp'];

export function podeReduzir(arquivo: File): boolean {
  return REDUZIVEIS.includes(arquivo.type);
}

export function calcularDestino(
  largura: number,
  altura: number,
  ladoMaximo = LADO_MAXIMO
): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= ladoMaximo) return { largura, altura };
  const fator = ladoMaximo / maior;
  // Math.round e não floor: com floor, uma imagem de 1px numa dimensão
  // poderia chegar a zero e o canvas lançaria.
  return {
    largura: Math.max(1, Math.round(largura * fator)),
    altura: Math.max(1, Math.round(altura * fator)),
  };
}

export async function reduzirImagem(arquivo: File, ladoMaximo = LADO_MAXIMO): Promise<File> {
  if (!podeReduzir(arquivo)) return arquivo;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    // Arquivo corrompido, formato que o navegador não abre, ou createImageBitmap
    // indisponível. Devolver o original é melhor do que impedir o envio: o
    // servidor ainda valida tipo e tamanho.
    return arquivo;
  }

  try {
    const destino = calcularDestino(bitmap.width, bitmap.height, ladoMaximo);
    if (destino.largura === bitmap.width && destino.altura === bitmap.height
        && arquivo.type === 'image/jpeg') {
      return arquivo;
    }

    const canvas = document.createElement('canvas');
    canvas.width = destino.largura;
    canvas.height = destino.altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) return arquivo;
    ctx.drawImage(bitmap, 0, 0, destino.largura, destino.altura);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG)
    );
    if (!blob) return arquivo;

    // Se a "redução" ficou maior que o original (acontece com PNG pequeno já
    // otimizado), manda o original.
    if (blob.size >= arquivo.size) return arquivo;

    const nome = arquivo.name.replace(/\.[^.]+$/, '') || 'comprovante';
    return new File([blob], `${nome}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap.close?.();
  }
}
