import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, LassoSelect, Pencil, RefreshCw, Route as RouteIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api';
import { useOtimizarRota } from '@/pages/OtimizacaoRotas/api';
import { DEPOSITO } from '@/pages/OtimizacaoRotas/gerarPedidos';
import { pedidosDentroDoPoligono } from '@/pages/OtimizacaoRotas/pontoNoPoligono';
import { PALETA_CORES, TIPOS_VEICULO } from '@/pages/OtimizacaoRotas/rotasSimuladas';
import type { Coordenada, ResultadoOtimizacao } from '@/pages/OtimizacaoRotas/types';
import type { StatusPlano } from '@/pages/Planos/types';
import { useAprovarRota, useMoverPedidos, useOtimizarPlano, usePlano, useRenomearPlano } from './api';
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
              <td className="px-4 py-3">{pedido.clienteNome}</td>
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

interface AcaoRapida {
  rotaIndex: number;
  tipo: 'atribuir' | 'desatribuir';
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
  const moverMutation = useMoverPedidos(id ?? '');

  const [resultadosPorGrupo, setResultadosPorGrupo] = useState<Record<number, ResultadoOtimizacao | null>>({});
  const [statusPorGrupo, setStatusPorGrupo] = useState<Record<number, 'calculando' | 'calculada' | 'erro'>>({});
  const [aprovando, setAprovando] = useState<number | null>(null);

  const [modoDesenho, setModoDesenho] = useState(false);
  const [pontosPoligono, setPontosPoligono] = useState<Coordenada[]>([]);
  const [acaoRapida, setAcaoRapida] = useState<AcaoRapida | null>(null);
  const [grupoEmFoco, setGrupoEmFoco] = useState<number | null>(null);

  const otimizado = plano?.status === 'OTIMIZADO';

  // Pedido com rotaIndex null num plano otimizado é o que foi desatribuído à
  // mão — fica no plano, fora de qualquer rota, esperando ser realocado.
  const naoAtribuidos = useMemo(
    () => (otimizado ? (plano?.pedidos ?? []).filter((p) => p.rotaIndex === null) : []),
    [plano, otimizado]
  );

  const grupos = useMemo(() => {
    if (!plano || !otimizado) return null;
    const mapa = new Map<number, PedidoDoPlano[]>();
    for (const pedido of plano.pedidos) {
      if (pedido.rotaIndex === null) continue;
      mapa.set(pedido.rotaIndex, [...(mapa.get(pedido.rotaIndex) ?? []), pedido]);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a - b);
  }, [plano, otimizado]);

  const assinaturaPorGrupo = useMemo(() => {
    const assinaturas: Record<number, string> = {};
    for (const [indice, pedidos] of grupos ?? []) {
      assinaturas[indice] = pedidos.map((p) => p.id).join(',');
    }
    return assinaturas;
  }, [grupos]);

  const assinaturaGrupos = grupos
    ? grupos.map(([indice]) => `${indice}:${assinaturaPorGrupo[indice]}`).join('|')
    : '';

  // Guarda a assinatura já calculada de cada grupo pra não refazer o traçado
  // de rotas que não mudaram — sem isso, mover um punhado de pedidos dispararia
  // uma chamada à ORS por rota do plano inteiro.
  const assinaturaCalculada = useRef<Record<number, string>>({});

  // Sequencial (não Promise.all) — mesmo motivo da Otimização de Rotas: evita
  // rajada simultânea de chamadas à ORS, que tem limite de requisições por
  // minuto no plano gratuito.
  useEffect(() => {
    if (!grupos) return;
    let cancelado = false;

    async function calcularTracadoDasRotas() {
      for (const [indice, pedidos] of grupos!) {
        if (assinaturaCalculada.current[indice] === assinaturaPorGrupo[indice]) continue;

        setStatusPorGrupo((atual) => ({ ...atual, [indice]: 'calculando' }));
        try {
          const resultado = await otimizarRotaMutation.mutateAsync({ origem: DEPOSITO, pedidos });
          if (cancelado) return;
          assinaturaCalculada.current[indice] = assinaturaPorGrupo[indice];
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

  // Só pedidos de rotas ainda não aprovadas entram na seleção: uma rota
  // aprovada já virou Rota real com Entregas, e o backend recusa movê-la.
  const pedidosMoviveis = useMemo(
    () => (otimizado ? (plano?.pedidos ?? []).filter((p) => p.rota === null) : []),
    [plano, otimizado]
  );

  const pedidosSelecionadosIds = useMemo(
    () => new Set(pedidosDentroDoPoligono(pedidosMoviveis, pontosPoligono).map((p) => p.id)),
    [pedidosMoviveis, pontosPoligono]
  );

  const selecaoTemPedidoEmRota = useMemo(
    () =>
      pedidosMoviveis.some((p) => p.rotaIndex !== null && pedidosSelecionadosIds.has(p.id)),
    [pedidosMoviveis, pedidosSelecionadosIds]
  );

  const gruposNaoAprovados = (grupos ?? []).filter(([, pedidos]) => pedidos[0]?.rota == null);
  const proximoIndice = Math.max(0, ...(grupos ?? []).map(([indice]) => indice)) + 1;

  function limparDesenhoESelecao() {
    setModoDesenho(false);
    setPontosPoligono([]);
    setAcaoRapida(null);
  }

  function moverPedidos(pedidoIds: string[], rotaIndex: number | null, mensagem: string) {
    if (pedidoIds.length === 0) return;
    moverMutation.mutate(
      { pedidoIds, rotaIndex },
      {
        onSuccess: () => {
          toast.success(mensagem);
          limparDesenhoESelecao();
        },
        onError: (error) =>
          toast.error(getErrorMessage(error, 'Não foi possível mover os pedidos.')),
      }
    );
  }

  function handleIniciarDesenho() {
    setModoDesenho(true);
    setPontosPoligono([]);
    setAcaoRapida(null);
  }

  function handleCliqueMapa(ponto: Coordenada) {
    setPontosPoligono((atual) => [...atual, ponto]);
  }

  function handleFinalizarPoligono() {
    const selecionados = Array.from(pedidosSelecionadosIds);

    if (selecionados.length === 0) {
      toast.error('Nenhum pedido disponível dentro do polígono desenhado.');
      limparDesenhoESelecao();
      return;
    }

    if (acaoRapida) {
      if (acaoRapida.tipo === 'atribuir') {
        moverPedidos(
          selecionados,
          acaoRapida.rotaIndex,
          `${selecionados.length} pedido(s) movido(s) para a Rota ${acaoRapida.rotaIndex}.`
        );
        return;
      }

      const daRota = pedidosMoviveis
        .filter((p) => p.rotaIndex === acaoRapida.rotaIndex && pedidosSelecionadosIds.has(p.id))
        .map((p) => p.id);
      const ignorados = selecionados.length - daRota.length;

      if (daRota.length === 0) {
        toast.error(`Nenhum pedido da Rota ${acaoRapida.rotaIndex} dentro do polígono.`);
        limparDesenhoESelecao();
        return;
      }
      if (ignorados > 0) {
        toast(`${ignorados} pedido(s) selecionado(s) não pertenciam a essa rota e foram ignorados.`);
      }
      moverPedidos(daRota, null, `${daRota.length} pedido(s) desatribuído(s).`);
      return;
    }

    // Encerra o desenho, mas mantém a seleção visível pra mostrar a barra de ação.
    setModoDesenho(false);
  }

  function handleCriarRotaDaSelecao() {
    moverPedidos(
      Array.from(pedidosSelecionadosIds),
      proximoIndice,
      `Rota ${proximoIndice} criada com ${pedidosSelecionadosIds.size} pedido(s).`
    );
  }

  function handleAtribuirASelecao(valor: string) {
    const rotaIndex = Number(valor);
    moverPedidos(
      Array.from(pedidosSelecionadosIds),
      rotaIndex,
      `${pedidosSelecionadosIds.size} pedido(s) movido(s) para a Rota ${rotaIndex}.`
    );
  }

  function handleDesatribuirSelecao() {
    const emRota = pedidosMoviveis
      .filter((p) => p.rotaIndex !== null && pedidosSelecionadosIds.has(p.id))
      .map((p) => p.id);
    moverPedidos(emRota, null, `${emRota.length} pedido(s) desatribuído(s).`);
  }

  function handleAtribuirPedidosLinha(rotaIndex: number) {
    setAcaoRapida({ rotaIndex, tipo: 'atribuir' });
    setModoDesenho(true);
    setPontosPoligono([]);
  }

  function handleDesatribuirPedidosLinha(rotaIndex: number) {
    setAcaoRapida({ rotaIndex, tipo: 'desatribuir' });
    setModoDesenho(true);
    setPontosPoligono([]);
  }

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

  function handleAprovarRota(dados: {
    motoristaId: string | null
    veiculoId: string | null
    veiculoProprio: boolean
    dataHora: string
  }) {
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

        {otimizado && !modoDesenho && (
          <Button type="button" variant="outline" onClick={handleIniciarDesenho}>
            <LassoSelect className="w-4 h-4 mr-2" />
            Desenhar Polígono
          </Button>
        )}

        {modoDesenho && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {acaoRapida
                ? `Desenhando pra ${acaoRapida.tipo === 'atribuir' ? 'atribuir pedidos à' : 'desatribuir pedidos da'} Rota ${acaoRapida.rotaIndex}`
                : 'Clique no mapa pra adicionar pontos do polígono.'}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={handleFinalizarPoligono}
              disabled={pontosPoligono.length < 3}
            >
              Finalizar Polígono ({pontosPoligono.length})
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={limparDesenhoESelecao}>
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {!modoDesenho && pedidosSelecionadosIds.size > 0 && (
        <div className="rounded-lg border bg-amber-50 border-amber-100 p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-amber-800">
            {pedidosSelecionadosIds.size} pedido(s) selecionado(s)
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleCriarRotaDaSelecao}
            disabled={moverMutation.isPending}
          >
            Criar rota
          </Button>
          {gruposNaoAprovados.length > 0 && (
            <Select onValueChange={handleAtribuirASelecao} disabled={moverMutation.isPending}>
              <SelectTrigger className="w-56" aria-label="Atribuir à rota existente">
                <SelectValue placeholder="Atribuir à rota existente" />
              </SelectTrigger>
              <SelectContent>
                {gruposNaoAprovados.map(([indice, pedidosDoGrupo]) => (
                  <SelectItem key={indice} value={String(indice)}>
                    Rota {indice} ({pedidosDoGrupo.length} pedido(s))
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDesatribuirSelecao}
            disabled={!selecaoTemPedidoEmRota || moverMutation.isPending}
          >
            Desatribuir
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={limparDesenhoESelecao}>
            Cancelar seleção
          </Button>
        </div>
      )}

      {gruposParaMapa.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Mapa das rotas</h2>
          {calculandoRotasNoMapa && (
            <p className="text-xs text-muted-foreground">Calculando traçado das rotas...</p>
          )}
          <PlanoMapa
            origem={DEPOSITO}
            grupos={gruposParaMapa}
            naoAtribuidos={naoAtribuidos}
            pedidosSelecionadosIds={pedidosSelecionadosIds}
            grupoEmFocoIndice={grupoEmFoco}
            modoDesenho={modoDesenho}
            pontosPoligono={pontosPoligono}
            onCliqueMapa={handleCliqueMapa}
          />
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
                  <button
                    type="button"
                    onClick={() => setGrupoEmFoco((atual) => (atual === indice ? null : indice))}
                    aria-label={grupoEmFoco === indice ? `Desfocar Rota ${indice}` : `Focar Rota ${indice}`}
                    className={`font-semibold text-sm transition-colors ${
                      grupoEmFoco === indice ? 'text-blue-600' : 'hover:text-blue-600'
                    }`}
                  >
                    Rota {indice}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {veiculoDoGrupo(indice - 1)} · {pedidosDoGrupo.length} pedido(s)
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {!codigoAprovado && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAtribuirPedidosLinha(indice)}
                        >
                          Atribuir pedidos
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDesatribuirPedidosLinha(indice)}
                        >
                          Desatribuir pedidos
                        </Button>
                      </>
                    )}
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

          {naoAtribuidos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-gray-400" aria-hidden="true" />
                <h2 className="font-semibold text-sm">Sem rota</h2>
                <span className="text-xs text-muted-foreground">
                  {naoAtribuidos.length} pedido(s) fora de qualquer rota — selecione no mapa pra
                  realocar
                </span>
              </div>
              <TabelaPedidos pedidos={naoAtribuidos} />
            </div>
          )}
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
