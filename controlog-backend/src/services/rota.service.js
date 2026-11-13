import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError.js';
import { paginationArgs, paginationMeta } from '../utils/pagination.js';

const include = {
  motorista: { select: { id: true, nome: true } },
  veiculo: { select: { id: true, placa: true, modelo: true } },
  // Só o status de cada entrega — o suficiente pra contar total/pendentes na
  // tela de atribuição sem uma consulta agregada por rota.
  entregas: { select: { status: true } },
};

const PENDENTES = new Set(['PENDENTE', 'EM_TRANSITO']);

function toResponse(rota) {
  const entregas = rota.entregas ?? [];
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
    // Ambos podem ser null: a rota pode ter sido aprovada antes de se definir
    // quem dirige e em que veículo.
    motorista: rota.motorista ?? null,
    veiculo: rota.veiculo ?? null,
    // Com veiculoProprio, `veiculo` é null por invariante — é a marcação que
    // diz à tela mostrar "Veículo próprio" em vez de "a definir".
    veiculoProprio: rota.veiculoProprio ?? false,
    totalEntregas: entregas.length,
    entregasPendentes: entregas.filter((e) => PENDENTES.has(e.status)).length,
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

      // Combinação impossível depois de aplicar a atualização sobre o estado
      // atual: mandar só `veiculoId` numa rota marcada como veículo próprio
      // passaria pelo validador (que vê um campo só) e bateria na constraint
      // do banco, com mensagem técnica na tela.
      const veiculoProprioFinal = data.veiculoProprio ?? existente.veiculoProprio;
      const veiculoIdFinal = Object.prototype.hasOwnProperty.call(data, 'veiculoId')
        ? data.veiculoId
        : existente.veiculoId;
      if (veiculoProprioFinal && veiculoIdFinal) {
        throw new ValidationError(
          'Veículo próprio e veículo da frota são excludentes: escolha um dos dois.'
        );
      }

      // Reatribuir a rota a outro motorista tem que levar as entregas junto:
      // Entrega.motoristaId é independente do da Rota, e se ficasse pra trás o
      // motorista antigo continuaria vendo essas entregas como dele (e os
      // agregados de "entregas realizadas" contariam pra pessoa errada).
      // hasOwnProperty, e não um teste de verdade: `motoristaId: null` é um
      // pedido legítimo (desatribuir a rota) e seria descartado por um `&&`,
      // deixando as entregas com o motorista anterior — que continuaria a
      // vê-las como suas em "Minhas Rotas".
      const motoristaInformado = Object.prototype.hasOwnProperty.call(data, 'motoristaId');
      const trocouMotorista = motoristaInformado && data.motoristaId !== existente.motoristaId;

      const rota = await prisma.$transaction(async (tx) => {
        const atualizada = await tx.rota.update({ where: { id }, data, include });
        if (trocouMotorista) {
          await tx.entrega.updateMany({
            where: { rotaId: id },
            data: { motoristaId: data.motoristaId },
          });
        }
        return atualizada;
      });

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
