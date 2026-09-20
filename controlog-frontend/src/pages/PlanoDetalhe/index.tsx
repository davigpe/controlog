import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Pencil, RefreshCw, Route as RouteIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/api';
import { useOtimizarRota } from '@/pages/OtimizacaoRotas/api';
import { DEPOSITO } from '@/pages/OtimizacaoRotas/gerarPedidos';
import { PALETA_CORES, TIPOS_VEICULO } from '@/pages/OtimizacaoRotas/rotasSimuladas';
import type { ResultadoOtimizacao } from '@/pages/OtimizacaoRotas/types';
import type { StatusPlano } from '@/pages/Planos/types';
import { useAprovarRota, useOtimizarPlano, usePlano, useRenomearPlano } from './api';
import AprovarRotaModal from './AprovarRotaModal';
import PlanoMapa, { type GrupoNoMapa } from './PlanoMapa';
import RenomearPlanoModal from './RenomearPlanoModal';
import type { PedidoDoPlano } from './types';

const TAMANHO_ROTA_PADRAO = 10;

const statusStyle: Record<StatusPlano, string> = {
  ABERTO: 'bg-gray-100 text-gray-700',
  OTIMIZADO: 'bg-green-100 text-green-700',
};

const statusLabel: Record<StatusPlano, string> = {
  ABERTO: 'Aberto',
  OTIMIZADO: 'Otimizado',
};

function corDoGrupo(indice: number) {
  return PALETA_CORES[indice % PALETA_CORES.length];
}

function veiculoDoGrupo(indice: number) {
  const tipo = TIPOS_VEICULO[indice % TIPOS_VEICULO.length];
  return `${tipo} ${String(indice + 1).padStart(2, '0')}`;
}

function TabelaPedidos({ pedidos }: { pedidos: PedidoDoPlano[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Código</th>
            <th className="px-4 py-3 text-left">Cliente</th>
            <th className="px-4 py-3 text-left">Endereço</th>
            <th className="px-4 py-3 text-left">Cidade</th>
            <th className="px-4 py-3 text-left">Unidades</th>
            <th className="px-4 py-3 text-left">Volume</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id} className="border-t">
              <td className="px-4 py-3 font-medium">{pedido.codigo}</td>
              <td className="px-4 py-3">{pedido.cliente}</td>
              <td className="px-4 py-3">{pedido.endereco}</td>
              <td className="px-4 py-3">{pedido.cidade}</td>
              <td className="px-4 py-3">{pedido.unidades}</td>
              <td className="px-4 py-3">{pedido.volumeM3.toFixed(2)} m³</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlanoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [tamanhoRota, setTamanhoRota] = useState(TAMANHO_ROTA_PADRAO);
  const [renomeando, setRenomeando] = useState(false);

  const { data: plano, isLoading } = usePlano(id ?? '');
  const otimizarMutation = useOtimizarPlano(id ?? '');
  const renomearMutation = useRenomearPlano(id ?? '');
  const otimizarRotaMutation = useOtimizarRota();
  const aprovarRotaMutation = useAprovarRota(id ?? '');

  const [resultadosPorGrupo, setResultadosPorGrupo] = useState<Record<number, ResultadoOtimizacao | null>>({});
  const [statusPorGrupo, setStatusPorGrupo] = useState<Record<number, 'calculando' | 'calculada' | 'erro'>>({});
  const [aprovando, setAprovando] = useState<number | null>(null);

  const grupos = useMemo(() => {
    if (!plano || plano.status !== 'OTIMIZADO') return null;
    const mapa = new Map<number, PedidoDoPlano[]>();
    for (const pedido of plano.pedidos) {
      const indice = pedido.rotaIndex ?? 0;
      mapa.set(indice, [...(mapa.get(indice) ?? []), pedido]);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a - b);
  }, [plano]);

  const assinaturaGrupos = grupos
    ? grupos.map(([indice, pedidos]) => `${indice}:${pedidos.map((p) => p.id).join(',')}`).join('|')
    : '';

  // Sequencial (não Promise.all) — mesmo motivo da Otimização de Rotas: evita
  // rajada simultânea de chamadas à ORS, que tem limite de requisições por
  // minuto no plano gratuito.
  useEffect(() => {
    if (!grupos) return;
    let cancelado = false;

    async function calcularTracadoDasRotas() {
      for (const [indice, pedidos] of grupos!) {
        setStatusPorGrupo((atual) => ({ ...atual, [indice]: 'calculando' }));
        try {
          const resultado = await otimizarRotaMutation.mutateAsync({ origem: DEPOSITO, pedidos });
          if (cancelado) return;
          setResultadosPorGrupo((atual) => ({ ...atual, [indice]: resultado }));
          setStatusPorGrupo((atual) => ({ ...atual, [indice]: 'calculada' }));
        } catch (error) {
          if (cancelado) return;
          setStatusPorGrupo((atual) => ({ ...atual, [indice]: 'erro' }));
          toast.error(getErrorMessage(error, 'Não foi possível calcular o traçado de uma das rotas.'));
        }
      }
    }

    void calcularTracadoDasRotas();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaGrupos]);

  const gruposParaMapa: GrupoNoMapa[] = useMemo(
    () =>
      (grupos ?? []).map(([indice, pedidos]) => ({
        indice,
        cor: corDoGrupo(indice - 1),
        pedidos,
        resultado: resultadosPorGrupo[indice] ?? null,
      })),
    [grupos, resultadosPorGrupo]
  );

  const calculandoRotasNoMapa = (grupos ?? []).some(([indice]) => statusPorGrupo[indice] === 'calculando');

  function handleOtimizar() {
    otimizarMutation.mutate(tamanhoRota, {
      onSuccess: () => toast.success('Plano otimizado.'),
      onError: (error) => toast.error(getErrorMessage(error, 'Não foi possível otimizar o plano.')),
    });
  }

  function handleRenomear(nome: string) {
    renomearMutation.mutate(nome, {
      onSuccess: () => {
        toast.success('Plano renomeado.');
        setRenomeando(false);
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Não foi possível renomear o plano.')),
    });
  }

  function handleAprovarRota(dados: { motoristaId: string; veiculoId: string; dataHora: string }) {
    if (aprovando === null) return;
    aprovarRotaMutation.mutate(
      { rotaIndex: aprovando, ...dados },
      {
        onSuccess: (rota) => {
          toast.success(`Rota aprovada como ${rota.codigo}.`);
          setAprovando(null);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Não foi possível aprovar esta rota.')),
      }
    );
  }

  const pedidosDoGrupoEmAprovacao = grupos?.find(([indice]) => indice === aprovando)?.[1] ?? [];

  // Ação manual, separada do useEffect de cálculo automático — útil pra
  // tentar de novo só uma rota cujo traçado real falhou (ex.: limite de
  // requisições da ORS), sem precisar reotimizar o plano inteiro e mexer
  // no agrupamento de rotas já aprovadas.
  async function handleReotimizarRota(indice: number, pedidos: PedidoDoPlano[]) {
    setStatusPorGrupo((atual) => ({ ...atual, [indice]: 'calculando' }));
    try {
      const resultado = await otimizarRotaMutation.mutateAsync({ origem: DEPOSITO, pedidos });
      setResultadosPorGrupo((atual) => ({ ...atual, [indice]: resultado }));
      setStatusPorGrupo((atual) => ({ ...atual, [indice]: 'calculada' }));
      toast.success(`Traçado da Rota ${indice} recalculado.`);
    } catch (error) {
      setStatusPorGrupo((atual) => ({ ...atual, [indice]: 'erro' }));
      toast.error(getErrorMessage(error, 'Não foi possível recalcular esta rota.'));
    }
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando plano...</div>;
  }

  if (!plano) {
    return <div className="p-6 text-sm text-muted-foreground">Plano não encontrado.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{plano.nome}</h1>
            <button
              onClick={() => setRenomeando(true)}
              aria-label="Editar nome do plano"
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Pencil size={16} />
            </button>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[plano.status]}`}>
              {statusLabel[plano.status]}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {plano.pedidos.length} pedido(s) · criado em{' '}
            {format(new Date(plano.criadoEm), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="tamanho-rota">Pedidos por rota</Label>
          <Input
            id="tamanho-rota"
            type="number"
            min={1}
            max={50}
            value={tamanhoRota}
            onChange={(e) => setTamanhoRota(Number(e.target.value))}
            className="w-32"
          />
        </div>
        <Button
          type="button"
          onClick={handleOtimizar}
          disabled={plano.pedidos.length === 0 || otimizarMutation.isPending}
        >
          <RouteIcon className="w-4 h-4 mr-2" />
          {otimizarMutation.isPending ? 'Otimizando...' : 'Otimizar Plano'}
        </Button>
      </div>

      {gruposParaMapa.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Mapa das rotas</h2>
          {calculandoRotasNoMapa && (
            <p className="text-xs text-muted-foreground">Calculando traçado das rotas...</p>
          )}
          <PlanoMapa origem={DEPOSITO} grupos={gruposParaMapa} />
        </div>
      )}

      {plano.pedidos.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Este plano não tem nenhum pedido vinculado.
        </div>
      ) : grupos ? (
        <div className="space-y-4">
          {grupos.map(([indice, pedidosDoGrupo]) => {
            const codigoAprovado = pedidosDoGrupo[0]?.rota?.codigo ?? null;
            return (
              <div key={indice} className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: corDoGrupo(indice - 1) }}
                    aria-hidden="true"
                  />
                  <h2 className="font-semibold text-sm">Rota {indice}</h2>
                  <span className="text-xs text-muted-foreground">
                    {veiculoDoGrupo(indice - 1)} · {pedidosDoGrupo.length} pedido(s)
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title={`Reotimizar traçado da Rota ${indice}`}
                      aria-label={`Reotimizar Rota ${indice}`}
                      disabled={statusPorGrupo[indice] === 'calculando'}
                      onClick={() => handleReotimizarRota(indice, pedidosDoGrupo)}
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${statusPorGrupo[indice] === 'calculando' ? 'animate-spin' : ''}`}
                      />
                    </Button>
                    {codigoAprovado ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aprovada — {codigoAprovado}
                      </span>
                    ) : (
                      <Button type="button" size="sm" variant="outline" onClick={() => setAprovando(indice)}>
                        Aprovar Rota
                      </Button>
                    )}
                  </div>
                </div>
                <TabelaPedidos pedidos={pedidosDoGrupo} />
              </div>
            );
          })}
        </div>
      ) : (
        <TabelaPedidos pedidos={plano.pedidos} />
      )}

      <RenomearPlanoModal
        open={renomeando}
        nomeAtual={plano.nome}
        saving={renomearMutation.isPending}
        onSalvar={handleRenomear}
        onFechar={() => setRenomeando(false)}
      />

      <AprovarRotaModal
        open={aprovando !== null}
        rotaIndice={aprovando ?? 0}
        totalPedidos={pedidosDoGrupoEmAprovacao.length}
        saving={aprovarRotaMutation.isPending}
        onConfirmar={handleAprovarRota}
        onFechar={() => setAprovando(null)}
      />
    </div>
  );
}
