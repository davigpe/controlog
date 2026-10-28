import { ConflictError, NotFoundError, ValidationError } from '../utils/AppError.js';
import { proximoCodigoSequencial } from '../utils/codigoSequencial.js';
import { ordenarPorVarredura } from '../utils/geo.js';
import { paginationArgs, paginationMeta } from '../utils/pagination.js';

// Mesma coordenada do Centro de Distribuição simulado usada em toda a
// aplicação (controlog-frontend/src/pages/OtimizacaoRotas/gerarPedidos.ts).
export const DEPOSITO = { lat: -26.3045, lng: -48.8487 };

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
        include: {
          pedidos: {
            orderBy: [{ rotaIndex: 'asc' }, { criadoEm: 'asc' }],
            include: { rota: { select: { codigo: true } } },
          },
        },
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
        include: { pedidos: true },
      });
      if (!plano) throw new NotFoundError('Plano não encontrado.');
      if (plano.pedidos.length === 0) {
        throw new ValidationError('Este plano não tem nenhum pedido pra otimizar.');
      }

      // Varredura geográfica antes de cortar em fatias de tamanhoRota — sem
      // isso, o corte seguiria a ordem de criação dos pedidos e cada rota
      // acabaria espalhada pela cidade inteira em vez de cobrir uma região
      // compacta.
      const ordemGeografica = ordenarPorVarredura(DEPOSITO, plano.pedidos);

      // Agrupado em updateMany por rotaIndex (1 query por rota, não 1 por
      // pedido) — com muitos pedidos, um update individual por linha estourava
      // o timeout padrão da transação do Prisma (5s) contra um banco remoto
      // (Neon), por causa da latência de rede de cada round-trip.
      await prisma.$transaction(
        async (tx) => {
          for (let inicio = 0; inicio < ordemGeografica.length; inicio += tamanhoRota) {
            const grupo = ordemGeografica.slice(inicio, inicio + tamanhoRota);
            const rotaIndex = inicio / tamanhoRota + 1;
            await tx.pedido.updateMany({
              where: { id: { in: grupo.map((p) => p.id) } },
              data: { rotaIndex },
            });
          }
          await tx.plano.update({ where: { id }, data: { status: 'OTIMIZADO' } });
        },
        { timeout: 10000 }
      );

      return this.getById(id);
    },

    // Move pedidos entre os grupos de um plano já otimizado — é o que
    // sustenta a seleção por polígono na tela do plano (atribuir a outra rota,
    // mandar pra uma rota nova, ou desatribuir com rotaIndex null).
    //
    // Grupo já aprovado é intocável nos dois sentidos: ele virou uma Rota real
    // com Entregas, e mexer nos pedidos aqui deixaria o plano e a operação
    // contando coisas diferentes.
    async moverPedidos(planoId, { pedidoIds, rotaIndex }) {
      const plano = await prisma.plano.findUnique({ where: { id: planoId } });
      if (!plano) throw new NotFoundError('Plano não encontrado.');
      if (plano.status !== 'OTIMIZADO') {
        throw new ValidationError('Otimize o plano antes de reorganizar os pedidos.');
      }

      const pedidos = await prisma.pedido.findMany({ where: { id: { in: pedidoIds } } });
      if (pedidos.length !== pedidoIds.length) {
        throw new ValidationError('Um ou mais pedidos informados não existem.');
      }
      const deOutroPlano = pedidos.find((p) => p.planoId !== planoId);
      if (deOutroPlano) {
        throw new ValidationError(`O pedido ${deOutroPlano.codigo} não pertence a este plano.`);
      }

      const jaAprovado = pedidos.find((p) => p.rotaId !== null);
      if (jaAprovado) {
        throw new ConflictError(
          `O pedido ${jaAprovado.codigo} está numa rota já aprovada e não pode ser movido.`
        );
      }

      if (rotaIndex !== null) {
        const destinoAprovado = await prisma.pedido.findFirst({
          where: { planoId, rotaIndex, rotaId: { not: null } },
        });
        if (destinoAprovado) {
          throw new ConflictError(`A Rota ${rotaIndex} já foi aprovada e não aceita novos pedidos.`);
        }
      }

      await prisma.pedido.updateMany({
        where: { id: { in: pedidoIds } },
        data: { rotaIndex },
      });

      return this.getById(planoId);
    },

    // Promove um grupo (rotaIndex) já otimizado a uma Rota real: cria a
    // Rota com um código sequencial RT-XXX, marca os pedidos do grupo como
    // aprovados (Pedido.rotaId) e cria uma Entrega por pedido — a partir
    // daqui a rota aparece na página real de Rotas e entra nos agregados
    // de Dashboard/Relatórios, igual a qualquer rota cadastrada na mão.
    async aprovarRota(planoId, rotaIndex, { motoristaId, veiculoId, dataHora }) {
      const indice = Number(rotaIndex);
      if (!Number.isInteger(indice) || indice < 1) {
        throw new ValidationError('rotaIndex inválido.');
      }

      const plano = await prisma.plano.findUnique({ where: { id: planoId } });
      if (!plano) throw new NotFoundError('Plano não encontrado.');
      if (plano.status !== 'OTIMIZADO') {
        throw new ValidationError('Otimize o plano antes de aprovar uma de suas rotas.');
      }

      const pedidosDoGrupo = await prisma.pedido.findMany({
        where: { planoId, rotaIndex: indice },
      });
      if (pedidosDoGrupo.length === 0) {
        throw new NotFoundError(`Rota ${indice} não encontrada neste plano.`);
      }
      if (pedidosDoGrupo.some((p) => p.rotaId !== null)) {
        throw new ConflictError(`A Rota ${indice} deste plano já foi aprovada.`);
      }

      const [motorista, veiculo] = await Promise.all([
        prisma.motorista.findUnique({ where: { id: motoristaId } }),
        prisma.veiculo.findUnique({ where: { id: veiculoId } }),
      ]);
      if (!motorista) throw new ValidationError('Motorista informado não existe.');
      if (!veiculo) throw new ValidationError('Veículo informado não existe.');

      const cidades = [...new Set(pedidosDoGrupo.map((p) => p.cidade))];
      const latDestino = pedidosDoGrupo.reduce((soma, p) => soma + p.lat, 0) / pedidosDoGrupo.length;
      const lngDestino = pedidosDoGrupo.reduce((soma, p) => soma + p.lng, 0) / pedidosDoGrupo.length;

      return prisma.$transaction(
        async (tx) => {
          const ultimaRota = await tx.rota.findFirst({
            where: { codigo: { startsWith: 'RT-' } },
            orderBy: { codigo: 'desc' },
            select: { codigo: true },
          });
          const codigoRota = proximoCodigoSequencial(
            ultimaRota ? [ultimaRota.codigo] : [],
            'RT-'
          );

          const rota = await tx.rota.create({
            data: {
              codigo: codigoRota,
              origem: 'Centro de Distribuição',
              destino: cidades.join(', '),
              latOrigem: DEPOSITO.lat,
              lngOrigem: DEPOSITO.lng,
              latDestino,
              lngDestino,
              status: 'ATIVA',
              dataHora,
              motoristaId,
              veiculoId,
            },
          });

          await tx.pedido.updateMany({
            where: { planoId, rotaIndex: indice },
            data: { rotaId: rota.id },
          });

          // Códigos calculados em memória (sem consultar o banco a cada
          // iteração) e gravados num createMany só — mesmo motivo do
          // otimizar(): 1 query em vez de 1 por pedido evita estourar o
          // timeout da transação contra um banco remoto.
          // Busca apenas o último registro de entrega em vez de trazer a tabela inteira para a memória.
          const ultimaEntrega = await tx.entrega.findFirst({
            where: { codigo: { startsWith: 'EN-' } },
            orderBy: { codigo: 'desc' },
            select: { codigo: true },
          });
          let proximoCodigoEntrega = proximoCodigoSequencial(
            ultimaEntrega ? [ultimaEntrega.codigo] : [],
            'EN-'
          );
          const entregasData = pedidosDoGrupo.map((pedido) => {
            const codigo = proximoCodigoEntrega;
            proximoCodigoEntrega = proximoCodigoSequencial([proximoCodigoEntrega], 'EN-');
            return {
              codigo,
              destino: `${pedido.endereco}, ${pedido.cidade}`,
              status: 'PENDENTE',
              dataPrevista: dataHora,
              rotaId: rota.id,
              motoristaId,
            };
          });
          await tx.entrega.createMany({ data: entregasData });

          return rota;
        },
        { timeout: 10000 }
      );
    },

    async remove(id) {
      const existente = await prisma.plano.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Plano não encontrado.');
      // onDelete: SetNull no schema já libera os pedidos (voltam a planoId null).
      await prisma.plano.delete({ where: { id } });
    },
  };
}
