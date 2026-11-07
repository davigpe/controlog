// Fuso de operação do Controlog. O servidor roda em UTC, mas "o dia" para
// quem opera a frota é o dia civil brasileiro — sem isso, uma rota das 22h
// apareceria no dia seguinte. Offset fixo, e não time zone nomeado, porque o
// Brasil não tem horário de verão desde 2019 e assim o recorte não depende do
// banco de dados de fusos do ambiente.
const FUSO_OPERACAO = '-03:00';

/** Início e fim (inclusivo) do dia civil, no fuso de operação. */
export function intervaloDoDia(data) {
  return {
    inicio: new Date(`${data}T00:00:00.000${FUSO_OPERACAO}`),
    fim: new Date(`${data}T23:59:59.999${FUSO_OPERACAO}`),
  };
}

/** Hoje no fuso de operação, como AAAA-MM-DD. */
export function hojeNoFusoDeOperacao(agora = new Date()) {
  const deslocado = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return deslocado.toISOString().slice(0, 10);
}

const CONCLUIDAS = new Set(['ENTREGUE']);

// RF13/RF14 — Relatórios operacionais de rotas e entregas filtráveis por período,
// com métricas consolidadas de desempenho
export function createRelatorioService(prisma) {
  return {
    // RF-extra — "quantas rotas foram carregadas no dia, com horário", pedido
    // na avaliação com usuários da área de logística. É a visão operacional
    // de um dia só: serve para conferir a saída da frota pela manhã e para
    // exportar o espelho do dia em planilha.
    async getRotasDoDia({ data, base = 'dataHora' } = {}) {
      const dia = data ?? hojeNoFusoDeOperacao();
      const { inicio, fim } = intervaloDoDia(dia);

      const rotas = await prisma.rota.findMany({
        where: { [base]: { gte: inicio, lte: fim } },
        include: {
          motorista: { select: { id: true, nome: true } },
          veiculo: { select: { id: true, placa: true, modelo: true } },
          entregas: { select: { status: true } },
        },
        // Cronológica, e não a mais recente primeiro como na página de Rotas:
        // aqui a leitura é a ordem em que a frota sai ao longo do dia.
        orderBy: { [base]: 'asc' },
      });

      const items = rotas.map((rota) => ({
        id: rota.id,
        codigo: rota.codigo,
        origem: rota.origem,
        destino: rota.destino,
        status: rota.status,
        dataHora: rota.dataHora,
        criadoEm: rota.criadoEm,
        motorista: rota.motorista,
        veiculo: rota.veiculo,
        totalEntregas: rota.entregas.length,
        entregasConcluidas: rota.entregas.filter((e) => CONCLUIDAS.has(e.status)).length,
      }));

      return {
        data: dia,
        base,
        totalRotas: items.length,
        totalEntregas: items.reduce((soma, rota) => soma + rota.totalEntregas, 0),
        entregasConcluidas: items.reduce((soma, rota) => soma + rota.entregasConcluidas, 0),
        rotas: items,
      };
    },

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
