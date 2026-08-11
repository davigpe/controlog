// RF07 — Dashboard com total de rotas ativas, concluídas, canceladas e número de motoristas
export function createDashboardService(prisma) {
  return {
    async getResumo() {
      const [rotasAtivas, rotasConcluidas, rotasCanceladas, totalMotoristas, totalVeiculos, totalEntregas] =
        await Promise.all([
          prisma.rota.count({ where: { status: 'ATIVA' } }),
          prisma.rota.count({ where: { status: 'CONCLUIDA' } }),
          prisma.rota.count({ where: { status: 'CANCELADA' } }),
          prisma.motorista.count(),
          prisma.veiculo.count(),
          prisma.entrega.count(),
        ]);

      const entregasPorStatus = await prisma.entrega.groupBy({
        by: ['status'],
        _count: { _all: true },
      });

      return {
        rotas: {
          ativas: rotasAtivas,
          concluidas: rotasConcluidas,
          canceladas: rotasCanceladas,
          total: rotasAtivas + rotasConcluidas + rotasCanceladas,
        },
        totalMotoristas,
        totalVeiculos,
        totalEntregas,
        entregasPorStatus: entregasPorStatus.reduce(
          (acc, item) => ({ ...acc, [item.status]: item._count._all }),
          {}
        ),
      };
    },
  };
}
