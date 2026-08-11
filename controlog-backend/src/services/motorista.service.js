import { ConflictError, NotFoundError } from '../utils/AppError.js';

function toResponse(motorista, extras = {}) {
  return {
    id: motorista.id,
    nome: motorista.nome,
    cnh: motorista.cnh,
    telefone: motorista.telefone,
    status: motorista.status,
    criadoEm: motorista.criadoEm,
    ...extras,
  };
}

export function createMotoristaService(prisma) {
  return {
    async list({ busca, status } = {}) {
      const motoristas = await prisma.motorista.findMany({
        where: {
          status: status ?? undefined,
          ...(busca
            ? {
                OR: [
                  { nome: { contains: busca, mode: 'insensitive' } },
                  { cnh: { contains: busca, mode: 'insensitive' } },
                  { telefone: { contains: busca, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { nome: 'asc' },
      });

      return Promise.all(
        motoristas.map(async (motorista) => {
          const [rotasAtivas, entregasRealizadas] = await Promise.all([
            prisma.rota.count({ where: { motoristaId: motorista.id, status: 'ATIVA' } }),
            prisma.entrega.count({ where: { motoristaId: motorista.id, status: 'ENTREGUE' } }),
          ]);
          return toResponse(motorista, { emRota: rotasAtivas > 0, entregasRealizadas });
        })
      );
    },

    async getById(id) {
      const motorista = await prisma.motorista.findUnique({ where: { id } });
      if (!motorista) throw new NotFoundError('Motorista não encontrado.');

      const [rotasAtivas, entregasRealizadas] = await Promise.all([
        prisma.rota.count({ where: { motoristaId: id, status: 'ATIVA' } }),
        prisma.entrega.count({ where: { motoristaId: id, status: 'ENTREGUE' } }),
      ]);

      return toResponse(motorista, { emRota: rotasAtivas > 0, entregasRealizadas });
    },

    async create(data) {
      const motorista = await prisma.motorista.create({ data });
      return toResponse(motorista, { emRota: false, entregasRealizadas: 0 });
    },

    async update(id, data) {
      const existente = await prisma.motorista.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Motorista não encontrado.');

      const motorista = await prisma.motorista.update({ where: { id }, data });
      return this.getById(motorista.id);
    },

    // RN03 — Não é possível excluir um motorista que possui rotas ativas vinculadas
    async remove(id) {
      const existente = await prisma.motorista.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Motorista não encontrado.');

      const rotasAtivas = await prisma.rota.count({ where: { motoristaId: id, status: 'ATIVA' } });
      if (rotasAtivas > 0) {
        throw new ConflictError(
          'Não é possível excluir um motorista com rotas ativas vinculadas (RN03).'
        );
      }

      await prisma.motorista.delete({ where: { id } });
    },
  };
}
