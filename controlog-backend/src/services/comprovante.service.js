import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DIRETORIO_COMPROVANTES,
  MAXIMO_POR_ENTREGA,
} from '../config/comprovantes.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError.js';

export function toComprovanteResponse(comprovante) {
  return {
    id: comprovante.id,
    nomeOriginal: comprovante.nomeOriginal,
    mimeType: comprovante.mimeType,
    tamanho: comprovante.tamanho,
    criadoEm: comprovante.criadoEm,
  };
}

/**
 * Caminho em disco de um comprovante.
 *
 * O `arquivo` guardado no banco é sempre um nome gerado pelo servidor, mas
 * esta checagem existe mesmo assim: se um dia uma linha for escrita por outro
 * caminho (importação, correção manual no banco, bug futuro), um valor com
 * ".." leria arquivo fora da pasta. Validar na leitura custa nada e fecha a
 * porta independentemente de quem escreveu a linha.
 */
export function caminhoDoArquivo(nomeNoDisco) {
  const resolvido = path.resolve(DIRETORIO_COMPROVANTES, nomeNoDisco);
  const raiz = path.resolve(DIRETORIO_COMPROVANTES);
  if (resolvido !== raiz && !resolvido.startsWith(raiz + path.sep)) {
    throw new ValidationError('Caminho de arquivo inválido.');
  }
  return resolvido;
}

export function createComprovanteService(prisma) {
  async function buscarComDono(comprovanteId) {
    const comprovante = await prisma.comprovanteEntrega.findUnique({
      where: { id: comprovanteId },
      include: { entrega: { select: { id: true, status: true, motoristaId: true } } },
    });
    if (!comprovante) throw new NotFoundError('Comprovante não encontrado.');
    return comprovante;
  }

  return {
    /**
     * `motoristaId` restringe ao dono da entrega; a gestão passa null e vê
     * qualquer uma. Mesma convenção de `remover` e `abrir`.
     */
    async listarDaEntrega(entregaId, { motoristaId } = {}) {
      const entrega = await prisma.entrega.findUnique({
        where: { id: entregaId },
        select: { id: true, motoristaId: true },
      });
      if (!entrega) throw new NotFoundError('Entrega não encontrada.');
      if (motoristaId && entrega.motoristaId !== motoristaId) {
        throw new ForbiddenError('Esta entrega não está atribuída a você.');
      }

      const comprovantes = await prisma.comprovanteEntrega.findMany({
        where: { entregaId },
        orderBy: { criadoEm: 'asc' },
      });
      return comprovantes.map(toComprovanteResponse);
    },

    /**
     * Registra um arquivo que o multer já gravou em disco.
     *
     * Se qualquer validação falhar, o arquivo é removido antes de lançar: o
     * multer grava antes de o service rodar, e sem essa limpeza cada tentativa
     * recusada deixaria lixo no volume.
     */
    async registrar({ entregaId, motoristaId, arquivo }) {
      const limpar = async () => {
        await fs.unlink(caminhoDoArquivo(arquivo.filename)).catch(() => {});
      };

      const entrega = await prisma.entrega.findUnique({ where: { id: entregaId } });
      if (!entrega) {
        await limpar();
        throw new NotFoundError('Entrega não encontrada.');
      }
      if (motoristaId && entrega.motoristaId !== motoristaId) {
        await limpar();
        throw new ForbiddenError('Esta entrega não está atribuída a você.');
      }
      if (entrega.status === 'ENTREGUE') {
        await limpar();
        throw new ConflictError('Esta entrega já foi concluída e não aceita novos comprovantes.');
      }
      if (entrega.status === 'CANCELADA') {
        await limpar();
        throw new ValidationError('Uma entrega cancelada não aceita comprovantes.');
      }

      const jaExistem = await prisma.comprovanteEntrega.count({ where: { entregaId } });
      if (jaExistem >= MAXIMO_POR_ENTREGA) {
        await limpar();
        throw new ConflictError(
          `Esta entrega já tem ${MAXIMO_POR_ENTREGA} comprovantes, que é o máximo.`
        );
      }

      const criado = await prisma.comprovanteEntrega.create({
        data: {
          entregaId,
          arquivo: arquivo.filename,
          nomeOriginal: arquivo.originalname,
          mimeType: arquivo.mimetype,
          tamanho: arquivo.size,
        },
      });

      return toComprovanteResponse(criado);
    },

    /**
     * Remove um comprovante. `motoristaId` restringe ao dono; a gestão passa
     * null e pode remover qualquer um.
     */
    async remover(comprovanteId, { motoristaId } = {}) {
      const comprovante = await buscarComDono(comprovanteId);

      if (motoristaId && comprovante.entrega.motoristaId !== motoristaId) {
        throw new ForbiddenError('Este comprovante não é de uma entrega sua.');
      }
      // Depois de concluída, o comprovante é o registro do que aconteceu.
      // Deixar o motorista apagá-lo permitiria concluir com uma foto e removê-la
      // em seguida, esvaziando a regra.
      if (comprovante.entrega.status === 'ENTREGUE') {
        throw new ConflictError(
          'A entrega já foi concluída. O comprovante não pode mais ser removido.'
        );
      }

      // O arquivo sai antes da linha: se a ordem fosse inversa e a remoção do
      // arquivo falhasse, o disco ficaria com um órfão que ninguém mais
      // consegue encontrar pelo banco.
      await fs.unlink(caminhoDoArquivo(comprovante.arquivo)).catch(() => {});
      await prisma.comprovanteEntrega.delete({ where: { id: comprovanteId } });
    },

    /**
     * Dados para servir o arquivo. `motoristaId` restringe ao dono; a gestão
     * passa null e enxerga qualquer comprovante.
     */
    async abrir(comprovanteId, { motoristaId } = {}) {
      const comprovante = await buscarComDono(comprovanteId);

      if (motoristaId && comprovante.entrega.motoristaId !== motoristaId) {
        throw new ForbiddenError('Este comprovante não é de uma entrega sua.');
      }

      const caminho = caminhoDoArquivo(comprovante.arquivo);
      try {
        await fs.access(caminho);
      } catch {
        // A linha existe e o arquivo não: volume trocado, restauração parcial
        // ou remoção manual. 404 com texto próprio, porque "comprovante não
        // encontrado" mandaria procurar no lugar errado.
        throw new NotFoundError('O arquivo deste comprovante não está mais disponível no servidor.');
      }

      return {
        caminho,
        mimeType: comprovante.mimeType,
        nomeOriginal: comprovante.nomeOriginal,
      };
    },
  };
}
