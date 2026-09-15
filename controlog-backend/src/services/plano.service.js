import { ConflictError, NotFoundError, ValidationError } from '../utils/AppError.js';
import { paginationArgs, paginationMeta } from '../utils/pagination.js';

function toResumo(plano) {
  return {
    id: plano.id,
    nome: plano.nome,
    status: plano.status,
    criadoEm: plano.criadoEm,
    totalPedidos: plano._count.pedidos,
  };
}

export function createPlanoService(prisma) {
  return {
    async list({ page = 1, pageSize = 10 } = {}) {
      const [planos, total] = await Promise.all([
        prisma.plano.findMany({
          include: { _count: { select: { pedidos: true } } },
          orderBy: { criadoEm: 'desc' },
          ...paginationArgs({ page, pageSize }),
        }),
        prisma.plano.count(),
      ]);

      return { items: planos.map(toResumo), pagination: paginationMeta({ page, pageSize, total }) };
    },

    async getById(id) {
      const plano = await prisma.plano.findUnique({
        where: { id },
        include: { pedidos: { orderBy: [{ rotaIndex: 'asc' }, { criadoEm: 'asc' }] } },
      });
      if (!plano) throw new NotFoundError('Plano não encontrado.');
      return plano;
    },

    async create({ nome, pedidoIds }) {
      const pedidos = await prisma.pedido.findMany({ where: { id: { in: pedidoIds } } });
      if (pedidos.length !== pedidoIds.length) {
        throw new ValidationError('Um ou mais pedidos informados não existem.');
      }
      const jaVinculado = pedidos.find((p) => p.planoId !== null);
      if (jaVinculado) {
        throw new ConflictError(`O pedido ${jaVinculado.codigo} já está vinculado a outro plano.`);
      }

      return prisma.$transaction(async (tx) => {
        const plano = await tx.plano.create({ data: { nome } });
        await tx.pedido.updateMany({
          where: { id: { in: pedidoIds } },
          data: { planoId: plano.id },
        });
        return tx.plano.findUnique({
          where: { id: plano.id },
          include: { pedidos: true },
        });
      });
    },

    async renomear(id, nome) {
      const existente = await prisma.plano.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Plano não encontrado.');
      return prisma.plano.update({ where: { id }, data: { nome } });
    },

    async otimizar(id, { tamanhoRota }) {
      const plano = await prisma.plano.findUnique({
        where: { id },
        include: { pedidos: { orderBy: { criadoEm: 'asc' } } },
      });
      if (!plano) throw new NotFoundError('Plano não encontrado.');
      if (plano.pedidos.length === 0) {
        throw new ValidationError('Este plano não tem nenhum pedido pra otimizar.');
      }

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < plano.pedidos.length; i++) {
          const rotaIndex = Math.floor(i / tamanhoRota) + 1;
          await tx.pedido.update({ where: { id: plano.pedidos[i].id }, data: { rotaIndex } });
        }
        await tx.plano.update({ where: { id }, data: { status: 'OTIMIZADO' } });
      });

      return this.getById(id);
    },

    async remove(id) {
      const existente = await prisma.plano.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Plano não encontrado.');
      // onDelete: SetNull no schema já libera os pedidos (voltam a planoId null).
      await prisma.plano.delete({ where: { id } });
    },
  };
}
