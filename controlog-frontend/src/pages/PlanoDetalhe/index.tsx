import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Route as RouteIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/api';
import { PALETA_CORES, TIPOS_VEICULO } from '@/pages/OtimizacaoRotas/rotasSimuladas';
import type { Pedido } from '@/pages/Pedidos/types';
import type { StatusPlano } from '@/pages/Planos/types';
import { useOtimizarPlano, usePlano, useRenomearPlano } from './api';
import RenomearPlanoModal from './RenomearPlanoModal';

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

function TabelaPedidos({ pedidos }: { pedidos: Pedido[] }) {
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

  const grupos = useMemo(() => {
    if (!plano || plano.status !== 'OTIMIZADO') return null;
    const mapa = new Map<number, Pedido[]>();
    for (const pedido of plano.pedidos) {
      const indice = pedido.rotaIndex ?? 0;
      mapa.set(indice, [...(mapa.get(indice) ?? []), pedido]);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a - b);
  }, [plano]);

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

      {plano.pedidos.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Este plano não tem nenhum pedido vinculado.
        </div>
      ) : grupos ? (
        <div className="space-y-4">
          {grupos.map(([indice, pedidosDoGrupo]) => (
            <div key={indice} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: corDoGrupo(indice - 1) }}
                  aria-hidden="true"
                />
                <h2 className="font-semibold text-sm">Rota {indice}</h2>
                <span className="text-xs text-muted-foreground">
                  {veiculoDoGrupo(indice - 1)} · {pedidosDoGrupo.length} pedido(s)
                </span>
              </div>
              <TabelaPedidos pedidos={pedidosDoGrupo} />
            </div>
          ))}
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
    </div>
  );
}
