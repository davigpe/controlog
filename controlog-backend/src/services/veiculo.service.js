import { ConflictError, NotFoundError } from '../utils/AppError.js';
import { paginationArgs, paginationMeta } from '../utils/pagination.js';

function toResponse(veiculo, extras = {}) {
  return {
    id: veiculo.id,
    placa: veiculo.placa,
    modelo: veiculo.modelo,
    capacidade: veiculo.capacidade,
    status: veiculo.status,
    criadoEm: veiculo.criadoEm,
    ...extras,
  };
}

export function createVeiculoService(prisma) {
  return {
    async list({ busca, status, emRota, page = 1, pageSize = 10 } = {}) {
      const where = {
        status: status ?? undefined,
        ...(emRota === true ? { rotas: { some: { status: 'ATIVA' } } } : {}),
        ...(emRota === false ? { rotas: { none: { status: 'ATIVA' } } } : {}),
        ...(busca
          ? {
              OR: [
                { placa: { contains: busca, mode: 'insensitive' } },
                { modelo: { contains: busca, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [veiculos, total] = await Promise.all([
        prisma.veiculo.findMany({ where, orderBy: { placa: 'asc' }, ...paginationArgs({ page, pageSize }) }),
        prisma.veiculo.count({ where }),
      ]);

      const items = await Promise.all(
        veiculos.map(async (veiculo) => {
          const rotasAtivas = await prisma.rota.count({ where: { veiculoId: veiculo.id, status: 'ATIVA' } });
          return toResponse(veiculo, { emRota: rotasAtivas > 0 });
        })
      );

      return { items, pagination: paginationMeta({ page, pageSize, total }) };
    },

    async getById(id) {
      const veiculo = await prisma.veiculo.findUnique({ where: { id } });
      if (!veiculo) throw new NotFoundError('Veículo não encontrado.');

      const rotasAtivas = await prisma.rota.count({ where: { veiculoId: id, status: 'ATIVA' } });
      return toResponse(veiculo, { emRota: rotasAtivas > 0 });
    },

    async create(data) {
      const veiculo = await prisma.veiculo.create({ data });
      return toResponse(veiculo, { emRota: false });
    },

    async update(id, data) {
      const existente = await prisma.veiculo.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Veículo não encontrado.');

      const veiculo = await prisma.veiculo.update({ where: { id }, data });
      return this.getById(veiculo.id);
    },

    // RN04 — Não é possível excluir um veículo que possui rotas ativas vinculadas
    async remove(id) {
      const existente = await prisma.veiculo.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Veículo não encontrado.');

      const rotasAtivas = await prisma.rota.count({ where: { veiculoId: id, status: 'ATIVA' } });
      if (rotasAtivas > 0) {
        throw new ConflictError(
          'Não é possível excluir um veículo com rotas ativas vinculadas (RN04).'
        );
      }

      await prisma.veiculo.delete({ where: { id } });
    },
  };
}
