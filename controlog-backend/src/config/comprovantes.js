import path from 'node:path';

/**
 * Onde os comprovantes de entrega ficam, e o que é aceito.
 *
 * Em produção isto aponta para um volume do Docker montado no contêiner, e
 * não para uma pasta dentro da imagem: a imagem é recriada a cada deploy, e
 * um arquivo gravado nela sumiria no deploy seguinte.
 *
 * Guardar em disco, e não no banco nem no S3: o banco incharia o backup
 * diário com binário que nunca muda, e o S3 exigiria credencial e bucket num
 * projeto que hoje não depende de nenhum dos dois. O custo dessa escolha está
 * registrado em docs/DEPLOY_AWS.md: os arquivos vivem numa instância só, e um
 * volume perdido não tem cópia.
 */
export const DIRETORIO_COMPROVANTES =
  process.env.COMPROVANTES_DIR ?? path.resolve(process.cwd(), 'uploads', 'comprovantes');

/**
 * 8 MB. Uma foto de celular moderno passa disso com facilidade, por isso o
 * aplicativo reduz a imagem antes de enviar. O limite aqui é a rede de
 * segurança para quem chamar a API direto, e para o caso de a redução falhar
 * no navegador.
 */
export const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024;

/**
 * Lista fechada de tipos, e a extensão de cada um.
 *
 * A extensão sai daqui, nunca do nome que o cliente mandou. Um arquivo
 * chamado "../../../.env" ou "foto.jpg.sh" viraria caminho ou executável se o
 * nome do cliente fosse usado para montar o caminho em disco.
 */
export const TIPOS_ACEITOS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
};

export const DESCRICAO_TIPOS_ACEITOS = 'JPEG, PNG, WebP, HEIC ou PDF';

/** Quantos comprovantes uma entrega aceita. */
export const MAXIMO_POR_ENTREGA = 5;
