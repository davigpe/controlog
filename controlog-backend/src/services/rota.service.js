import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError.js';
import { paginationArgs, paginationMeta } from '../utils/pagination.js';

const include = {
  motorista: { select: { id: true, nome: true } },
  veiculo: { select: { id: true, placa: true, modelo: true } },
};

function toResponse(rota) {
  return {
    id: rota.id,
    codigo: rota.codigo,
    origem: rota.origem,
    destino: rota.destino,
    status: rota.status,
    dataHora: rota.dataHora,
    criadoEm: rota.criadoEm,
    coordenadasOrigem: [rota.latOrigem, rota.lngOrigem],
    coordenadasDestino: [rota.latDestino, rota.lngDestino],
    motorista: rota.motorista,
    veiculo: rota.veiculo,
  };
}

const REATIVAVEL_APENAS_POR_GESTOR = new Set(['CONCLUIDA', 'CANCELADA']);

export function createRotaService(prisma) {
  return {
    async list({ busca, status, page = 1, pageSize = 10 } = {}) {
      const where = {
        status: status ?? undefined,
        ...(busca
          ? {
              OR: [
                { codigo: { contains: busca, mode: 'insensitive' } },
                { origem: { contains: busca, mode: 'insensitive' } },
                { destino: { contains: busca, mode: 'insensitive' } },
                { motorista: { nome: { contains: busca, mode: 'insensitive' } } },
                { veiculo: { placa: { contains: busca, mode: 'insensitive' } } },
              ],
            }
          : {}),
      };

      const [rotas, total] = await Promise.all([
        prisma.rota.findMany({
          where,
          include,
          orderBy: { dataHora: 'desc' },
          ...paginationArgs({ page, pageSize }),
        }),
        prisma.rota.count({ where }),
      ]);

      return { items: rotas.map(toResponse), pagination: paginationMeta({ page, pageSize, total }) };
    },

    async getById(id) {
      const rota = await prisma.rota.findUnique({ where: { id }, include });
      if (!rota) throw new NotFoundError('Rota não encontrada.');
      return toResponse(rota);
    },

    async create(data) {
      const [motorista, veiculo] = await Promise.all([
        prisma.motorista.findUnique({ where: { id: data.motoristaId } }),
        prisma.veiculo.findUnique({ where: { id: data.veiculoId } }),
      ]);
      if (!motorista) throw new ValidationError('Motorista informado não existe.');
      if (!veiculo) throw new ValidationError('Veículo informado não existe.');

      // RN05 — O código da rota deve ser único no sistema
      const codigoEmUso = await prisma.rota.findUnique({ where: { codigo: data.codigo } });
      if (codigoEmUso) throw new ConflictError('Já existe uma rota com este código (RN05).');

      const rota = await prisma.rota.create({ data, include });
      return toResponse(rota);
    },

    async update(id, data, actor) {
      const existente = await prisma.rota.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Rota não encontrada.');

      if (data.codigo && data.codigo !== existente.codigo) {
        const codigoEmUso = await prisma.rota.findUnique({ where: { codigo: data.codigo } });
        if (codigoEmUso) throw new ConflictError('Já existe uma rota com este código (RN05).');
      }

      // RN02 — Rota Concluída/Cancelada não pode ser reativada sem permissão de gestor
      if (
        data.status === 'ATIVA' &&
        REATIVAVEL_APENAS_POR_GESTOR.has(existente.status) &&
        actor?.perfil !== 'GESTOR'
      ) {
        throw new ForbiddenError(
          'Reativar uma rota Concluída ou Cancelada exige permissão de gestor (RN02).'
        );
      }

      if (data.motoristaId) {
        const motorista = await prisma.motorista.findUnique({ where: { id: data.motoristaId } });
        if (!motorista) throw new ValidationError('Motorista informado não existe.');
      }
      if (data.veiculoId) {
        const veiculo = await prisma.veiculo.findUnique({ where: { id: data.veiculoId } });
        if (!veiculo) throw new ValidationError('Veículo informado não existe.');
      }

      const rota = await prisma.rota.update({ where: { id }, data, include });
      return toResponse(rota);
    },

    // RN08 — Não é possível excluir uma rota que possua entregas pendentes vinculadas
    async remove(id) {
      const existente = await prisma.rota.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Rota não encontrada.');

      const entregasPendentes = await prisma.entrega.count({
        where: { rotaId: id, status: { in: ['PENDENTE', 'EM_TRANSITO'] } },
      });
      if (entregasPendentes > 0) {
        throw new ConflictError(
          'Não é possível excluir uma rota com entregas pendentes vinculadas (RN08).'
        );
      }

      await prisma.rota.delete({ where: { id } });
    },
  };
}
