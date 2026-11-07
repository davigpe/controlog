import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError.js';

// Visão restrita do motorista logado: só as rotas atribuídas a ele, cada uma
// com as próprias entregas. A única escrita que o motorista pode fazer é
// concluir uma entrega sua — cadastro e atribuição seguem sendo de
// gestor/operador.
// Forma unica da entrega devolvida ao motorista, para concluir e registrar
// insucesso responderem igual ao que a listagem ja entrega.
function toEntregaResponse(entrega) {
  return {
    id: entrega.id,
    codigo: entrega.codigo,
    destino: entrega.destino,
    status: entrega.status,
    dataPrevista: entrega.dataPrevista,
    dataEfetiva: entrega.dataEfetiva,
    motivoInsucesso: entrega.motivoInsucesso ?? null,
    observacao: entrega.observacao ?? null,
  };
}

export function createMinhasRotasService(prisma) {
  async function motoristaDoUsuario(usuarioId) {
    const motorista = await prisma.motorista.findUnique({ where: { usuarioId } });
    // Usuário com perfil MOTORISTA mas sem cadastro de motorista vinculado:
    // só acontece se o vínculo for desfeito no banco depois do login, então
    // é 403 (token válido, mas não dá acesso a nada) e não 404.
    if (!motorista) {
      throw new ForbiddenError('Este usuário não está vinculado a um cadastro de motorista.');
    }
    return motorista;
  }

  return {
    async listar(usuarioId, { status } = {}) {
      const motorista = await motoristaDoUsuario(usuarioId);

      const rotas = await prisma.rota.findMany({
        where: { motoristaId: motorista.id, status: status ?? undefined },
        include: {
          veiculo: { select: { id: true, placa: true, modelo: true } },
          entregas: {
            orderBy: { codigo: 'asc' },
            select: {
              id: true,
              codigo: true,
              destino: true,
              status: true,
              dataPrevista: true,
              dataEfetiva: true,
              motivoInsucesso: true,
              observacao: true,
            },
          },
        },
        orderBy: { dataHora: 'desc' },
      });

      return {
        motorista: {
          id: motorista.id,
          nome: motorista.nome,
          cnh: motorista.cnh,
          telefone: motorista.telefone,
          status: motorista.status,
        },
        rotas: rotas.map((rota) => ({
          id: rota.id,
          codigo: rota.codigo,
          origem: rota.origem,
          destino: rota.destino,
          status: rota.status,
          dataHora: rota.dataHora,
          coordenadasOrigem: [rota.latOrigem, rota.lngOrigem],
          coordenadasDestino: [rota.latDestino, rota.lngDestino],
          veiculo: rota.veiculo,
          entregas: rota.entregas,
        })),
      };
    },

    // O motorista confirma a entrega que ele mesmo fez. A checagem de dono é
    // feita aqui (e não só pelo perfil na rota HTTP) porque o id da entrega vem
    // da requisição — sem isso, um motorista poderia concluir a entrega de
    // outro só trocando o id.
    async concluirEntrega(usuarioId, entregaId) {
      const motorista = await motoristaDoUsuario(usuarioId);

      const entrega = await prisma.entrega.findUnique({ where: { id: entregaId } });
      if (!entrega) throw new NotFoundError('Entrega não encontrada.');
      if (entrega.motoristaId !== motorista.id) {
        throw new ForbiddenError('Esta entrega não está atribuída a você.');
      }
      if (entrega.status === 'ENTREGUE') {
        throw new ConflictError('Esta entrega já foi concluída.');
      }
      if (entrega.status === 'CANCELADA') {
        throw new ValidationError('Uma entrega cancelada não pode ser concluída.');
      }

      const atualizada = await prisma.entrega.update({
        where: { id: entregaId },
        data: { status: 'ENTREGUE', dataEfetiva: new Date() },
      });

      return toEntregaResponse(atualizada);
    },

    // Registrar insucesso é o reverso de concluir: a tentativa foi feita e
    // falhou. Fica NAO_ENTREGUE, e não CANCELADA — cancelada é o pedido que
    // nunca saiu. O gestor é quem decide o destino depois (reatribuir,
    // reagendar ou cancelar de fato), então aqui não há automação nenhuma.
    async registrarInsucesso(usuarioId, entregaId, { motivo, observacao }) {
      const motorista = await motoristaDoUsuario(usuarioId);

      const entrega = await prisma.entrega.findUnique({ where: { id: entregaId } });
      if (!entrega) throw new NotFoundError('Entrega não encontrada.');
      if (entrega.motoristaId !== motorista.id) {
        throw new ForbiddenError('Esta entrega não está atribuída a você.');
      }
      if (entrega.status === 'ENTREGUE') {
        throw new ConflictError('Esta entrega já foi concluída.');
      }
      if (entrega.status === 'NAO_ENTREGUE') {
        throw new ConflictError('Esta entrega já teve um insucesso registrado.');
      }
      if (entrega.status === 'CANCELADA') {
        throw new ValidationError('Uma entrega cancelada não aceita registro de insucesso.');
      }

      const atualizada = await prisma.entrega.update({
        where: { id: entregaId },
        data: {
          status: 'NAO_ENTREGUE',
          motivoInsucesso: motivo,
          observacao: observacao ?? null,
          dataEfetiva: new Date(),
        },
      });

      return toEntregaResponse(atualizada);
    },
  };
}
