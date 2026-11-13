import { ConflictError, NotFoundError } from '../utils/AppError.js';
import { paginationArgs, paginationMeta } from '../utils/pagination.js';

function toResponse(cliente) {
  return {
    id: cliente.id,
    codigo: cliente.codigo,
    nome: cliente.nome,
    endereco: cliente.endereco,
    bairro: cliente.bairro,
    cidade: cliente.cidade,
    uf: cliente.uf,
    coordenadas: [cliente.lat, cliente.lng],
    ativo: cliente.ativo,
    criadoEm: cliente.criadoEm,
    // Quantos pedidos já foram feitos para este cliente. Vem do _count para
    // não carregar os pedidos só para contá-los.
    totalPedidos: cliente._count?.pedidos ?? 0,
  };
}

export function createClienteService(prisma) {
  return {
    async list({ busca, ativo, page = 1, pageSize = 10 } = {}) {
      const where = {
        ...(ativo === undefined ? {} : { ativo }),
        ...(busca
          ? {
              OR: [
                { codigo: { contains: busca, mode: 'insensitive' } },
                { nome: { contains: busca, mode: 'insensitive' } },
                { endereco: { contains: busca, mode: 'insensitive' } },
                { bairro: { contains: busca, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [clientes, total] = await Promise.all([
        prisma.cliente.findMany({
          where,
          orderBy: { codigo: 'asc' },
          include: { _count: { select: { pedidos: true } } },
          ...paginationArgs({ page, pageSize }),
        }),
        prisma.cliente.count({ where }),
      ]);

      return {
        items: clientes.map(toResponse),
        pagination: paginationMeta({ page, pageSize, total }),
      };
    },

    async getById(id) {
      const cliente = await prisma.cliente.findUnique({
        where: { id },
        include: { _count: { select: { pedidos: true } } },
      });
      if (!cliente) throw new NotFoundError('Cliente não encontrado.');
      return toResponse(cliente);
    },

    /** Busca pelo identificador de negócio — é como um sistema externo chega aqui. */
    async getByCodigo(codigo) {
      const cliente = await prisma.cliente.findUnique({
        where: { codigo: codigo.toUpperCase() },
        include: { _count: { select: { pedidos: true } } },
      });
      if (!cliente) throw new NotFoundError(`Nenhum cliente com o código ${codigo}.`);
      return toResponse(cliente);
    },

    async create(data) {
      const existente = await prisma.cliente.findUnique({ where: { codigo: data.codigo } });
      if (existente) {
        throw new ConflictError(`Já existe um cliente com o código ${data.codigo}.`);
      }
      const criado = await prisma.cliente.create({
        data,
        include: { _count: { select: { pedidos: true } } },
      });
      return toResponse(criado);
    },

    async update(id, data) {
      const existente = await prisma.cliente.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Cliente não encontrado.');

      if (data.codigo && data.codigo !== existente.codigo) {
        const emUso = await prisma.cliente.findUnique({ where: { codigo: data.codigo } });
        if (emUso) throw new ConflictError(`Já existe um cliente com o código ${data.codigo}.`);
      }

      const atualizado = await prisma.cliente.update({
        where: { id },
        data,
        include: { _count: { select: { pedidos: true } } },
      });
      return toResponse(atualizado);
    },

    /**
     * Remover é bloqueado quando há pedidos vinculados.
     *
     * A chave estrangeira é SET NULL, então a remoção não apagaria nada — mas
     * deixaria pedidos órfãos, identificados só pelo nome gravado no momento, e
     * sem como voltar atrás. Para quem apenas deixou de ser cliente, o caminho
     * é marcar como inativo: ele some das sugestões e o histórico fica inteiro.
     */
    async remove(id) {
      const existente = await prisma.cliente.findUnique({
        where: { id },
        include: { _count: { select: { pedidos: true } } },
      });
      if (!existente) throw new NotFoundError('Cliente não encontrado.');

      if (existente._count.pedidos > 0) {
        throw new ConflictError(
          `Este cliente tem ${existente._count.pedidos} pedido(s) vinculado(s) e não pode ser excluído. ` +
            'Marque-o como inativo para tirá-lo das sugestões sem perder o histórico.'
        );
      }

      await prisma.cliente.delete({ where: { id } });
    },
  };
}
