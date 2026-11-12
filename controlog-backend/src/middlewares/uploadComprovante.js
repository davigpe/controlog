import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

import multer from 'multer';

import {
  DESCRICAO_TIPOS_ACEITOS,
  DIRETORIO_COMPROVANTES,
  TAMANHO_MAXIMO_BYTES,
  TIPOS_ACEITOS,
} from '../config/comprovantes.js';
import { ValidationError } from '../utils/AppError.js';

// Criado na subida, e não a cada upload: se o volume não estiver montado, é
// melhor descobrir agora do que no meio da primeira entrega do dia.
fs.mkdirSync(DIRETORIO_COMPROVANTES, { recursive: true });

const armazenamento = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DIRETORIO_COMPROVANTES),
  filename: (_req, file, cb) => {
    // Nome inteiramente gerado aqui. O nome enviado pelo cliente é guardado no
    // banco (nomeOriginal) só para exibir, e nunca toca o caminho em disco.
    cb(null, `${randomUUID()}${TIPOS_ACEITOS[file.mimetype]}`);
  },
});

export const uploadComprovante = multer({
  storage: armazenamento,
  limits: {
    fileSize: TAMANHO_MAXIMO_BYTES,
    // Um arquivo por requisição. Sem isto, um cliente poderia mandar
    // centenas num POST só e encher o disco da instância.
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_ACEITOS[file.mimetype]) {
      cb(new ValidationError(`Formato não aceito. Envie ${DESCRICAO_TIPOS_ACEITOS}.`));
      return;
    }
    cb(null, true);
  },
}).single('arquivo');
