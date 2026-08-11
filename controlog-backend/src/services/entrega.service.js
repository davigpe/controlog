import { ConflictError, NotFoundError, ValidationError } from '../utils/AppError.js';

const include = {
  rota: { select: { id: true, codigo: true } },
  motorista: { select: { id: true, nome: true } },
};

function toResponse(entrega) {
  return {
    id: entrega.id,
    codigo: entrega.codigo,
    destino: entrega.destino,
    status: entrega.status,
    dataPrevista: entrega.dataPrevista,
    dataEfetiva: entrega.dataEfetiva,
    criadoEm: entrega.criadoEm,
    rota: entrega.rota,
    motorista: entrega.motorista,
  };
}

export function createEntregaService(prisma) {
  return {
    async list({ busca, status, rotaId } = {}) {
      const entregas = await prisma.entrega.findMany({
        where: {
          status: status ?? undefined,
          rotaId: rotaId ?? undefined,
          ...(busca
            ? {
                OR: [
                  { codigo: { contains: busca, mode: 'insensitive' } },
                  { destino: { contains: busca, mode: 'insensitive' } },
                  { motorista: { nome: { contains: busca, mode: 'insensitive' } } },
                  { rota: { codigo: { contains: busca, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        include,
        orderBy: { dataPrevista: 'desc' },
      });
      return entregas.map(toResponse);
    },

    async getById(id) {
      const entrega = await prisma.entrega.findUnique({ where: { id }, include });
      if (!entrega) throw new NotFoundError('Entrega não encontrada.');
      return toResponse(entrega);
    },

    async create(data) {
      const [rota, motorista] = await Promise.all([
        prisma.rota.findUnique({ where: { id: data.rotaId } }),
        prisma.motorista.findUnique({ where: { id: data.motoristaId } }),
      ]);
      if (!rota) throw new ValidationError('Rota informada não existe (RN07).');
      if (!motorista) throw new ValidationError('Motorista informado não existe (RN07).');

      const codigoEmUso = await prisma.entrega.findUnique({ where: { codigo: data.codigo } });
      if (codigoEmUso) throw new ConflictError('Já existe uma entrega com este código.');

      const entrega = await prisma.entrega.create({ data, include });
      return toResponse(entrega);
    },

    async update(id, data) {
      const existente = await prisma.entrega.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Entrega não encontrada.');

      if (data.codigo && data.codigo !== existente.codigo) {
        const codigoEmUso = await prisma.entrega.findUnique({ where: { codigo: data.codigo } });
        if (codigoEmUso) throw new ConflictError('Já existe uma entrega com este código.');
      }
      if (data.rotaId) {
        const rota = await prisma.rota.findUnique({ where: { id: data.rotaId } });
        if (!rota) throw new ValidationError('Rota informada não existe (RN07).');
      }
      if (data.motoristaId) {
        const motorista = await prisma.motorista.findUnique({ where: { id: data.motoristaId } });
        if (!motorista) throw new ValidationError('Motorista informado não existe (RN07).');
      }

      const entrega = await prisma.entrega.update({ where: { id }, data, include });
      return toResponse(entrega);
    },

    async remove(id) {
      const existente = await prisma.entrega.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Entrega não encontrada.');
      await prisma.entrega.delete({ where: { id } });
    },
  };
}
