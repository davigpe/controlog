// RF13/RF14 — Relatórios operacionais de rotas e entregas filtráveis por período,
// com métricas consolidadas de desempenho
export function createRelatorioService(prisma) {
  return {
    async getRelatorio({ dataInicio, dataFim } = {}) {
      const periodoRota = {
        ...(dataInicio || dataFim
          ? { dataHora: { gte: dataInicio ?? undefined, lte: dataFim ?? undefined } }
          : {}),
      };
      const periodoEntrega = {
        ...(dataInicio || dataFim
          ? { dataPrevista: { gte: dataInicio ?? undefined, lte: dataFim ?? undefined } }
          : {}),
      };

      const [rotasPorStatus, entregasPorStatus, entregasNoPeriodo] = await Promise.all([
        prisma.rota.groupBy({ by: ['status'], where: periodoRota, _count: { _all: true } }),
        prisma.entrega.groupBy({ by: ['status'], where: periodoEntrega, _count: { _all: true } }),
        prisma.entrega.findMany({
          where: { ...periodoEntrega, status: 'ENTREGUE' },
          include: { motorista: { select: { id: true, nome: true } } },
        }),
      ]);

      const entregasPorMotorista = new Map();
      for (const entrega of entregasNoPeriodo) {
        const chave = entrega.motorista.id;
        const atual = entregasPorMotorista.get(chave) ?? { motorista: entrega.motorista.nome, entregas: 0 };
        atual.entregas += 1;
        entregasPorMotorista.set(chave, atual);
      }

      const motoristasMaisAtivos = [...entregasPorMotorista.values()]
        .sort((a, b) => b.entregas - a.entregas)
        .slice(0, 5);

      const totalEntregas = entregasPorStatus.reduce((acc, item) => acc + item._count._all, 0);

      return {
        periodo: { dataInicio: dataInicio ?? null, dataFim: dataFim ?? null },
        rotasPorStatus: rotasPorStatus.reduce(
          (acc, item) => ({ ...acc, [item.status]: item._count._all }),
          {}
        ),
        entregasPorStatus: entregasPorStatus.reduce(
          (acc, item) => ({ ...acc, [item.status]: item._count._all }),
          {}
        ),
        totalEntregas,
        motoristasMaisAtivos,
      };
    },
  };
}
