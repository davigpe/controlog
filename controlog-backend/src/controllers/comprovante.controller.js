import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Controllers dos comprovantes de entrega.
 *
 * `resolverMotoristaId` é o que separa as duas visões com o mesmo service:
 * na rota do motorista ele devolve o id de quem está logado, e o service
 * recusa tudo que não seja de uma entrega dele. Na rota da gestão devolve
 * null, e a checagem de dono não se aplica — gestor e operador enxergam a
 * operação inteira.
 */
export function createComprovanteController(comprovanteService, resolverMotoristaId) {
  return {
    listar: asyncHandler(async (req, res) => {
      const comprovantes = await comprovanteService.listarDaEntrega(req.params.id, {
        motoristaId: await resolverMotoristaId(req),
      });
      res.json(comprovantes);
    }),

    enviar: asyncHandler(async (req, res) => {
      if (!req.file) {
        res.status(422).json({
          error: 'ValidationError',
          message: 'Nenhum arquivo foi enviado. O comprovante deve vir no campo "arquivo".',
          path: req.originalUrl,
        });
        return;
      }

      const comprovante = await comprovanteService.registrar({
        entregaId: req.params.id,
        motoristaId: await resolverMotoristaId(req),
        arquivo: req.file,
      });

      res.status(201).json(comprovante);
    }),

    remover: asyncHandler(async (req, res) => {
      await comprovanteService.remover(req.params.id, {
        motoristaId: await resolverMotoristaId(req),
      });
      res.status(204).send();
    }),

    abrir: asyncHandler(async (req, res) => {
      const { caminho, mimeType, nomeOriginal } = await comprovanteService.abrir(req.params.id, {
        motoristaId: await resolverMotoristaId(req),
      });

      // inline, e não attachment: o motorista quer conferir a foto que acabou
      // de tirar, e o gestor quer vê-la na tela da entrega. Baixar um arquivo
      // para isso seria pior nos dois casos.
      //
      // O nome vai entre aspas e sem quebras de linha: ele vem do cliente, e
      // um nome com aspas ou CRLF permitiria injetar cabeçalho na resposta.
      const nomeSeguro = nomeOriginal.replace(/["\r\n]/g, '');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${nomeSeguro}"`);
      // Cache privado: a resposta é de um usuário autenticado e não pode ser
      // guardada por um proxy compartilhado.
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.sendFile(caminho);
    }),
  };
}
