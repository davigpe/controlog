import { useMemo, useState } from 'react';
import { LassoSelect, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { getErrorMessage } from '@/lib/api';
import { DEPOSITO, gerarPedidos } from './gerarPedidos';
import { pedidosDentroDoPoligono } from './pontoNoPoligono';
import {
  atribuirPedidos,
  criarRota,
  desatribuirPedidos,
  excluirRota,
  renomearRota,
  rotasAfetadas,
  type RotaSimulada,
} from './rotasSimuladas';
import { useOtimizarRota } from './api';
import OtimizacaoRotasMapa from './OtimizacaoRotasMapa';
import RotasSimuladasTable from './RotasSimuladasTable';
import RenomearRotaModal from './RenomearRotaModal';
import type { Coordenada, Pedido } from './types';

const QUANTIDADE_PADRAO = 12;
const QUANTIDADE_MAXIMA = 50;

interface AcaoRapida {
  rotaId: string;
  tipo: 'atribuir' | 'desatribuir';
}

export default function OtimizacaoRotas() {
  const [quantidade, setQuantidade] = useState(QUANTIDADE_PADRAO);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [rotas, setRotas] = useState<RotaSimulada[]>([]);

  const [modoDesenho, setModoDesenho] = useState(false);
  const [pontosPoligono, setPontosPoligono] = useState<Coordenada[]>([]);
  const [acaoRapida, setAcaoRapida] = useState<AcaoRapida | null>(null);

  const [rotaEmFocoId, setRotaEmFocoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<RotaSimulada | null>(null);
  const [excluindo, setExcluindo] = useState<RotaSimulada | null>(null);

  const otimizarMutation = useOtimizarRota();

  const pedidosPorId = useMemo(() => new Map(pedidos.map((p) => [p.id, p])), [pedidos]);

  const pedidosSelecionadosIds = useMemo(
    () => new Set(pedidosDentroDoPoligono(pedidos, pontosPoligono).map((p) => p.id)),
    [pedidos, pontosPoligono]
  );

  const selecaoTocaAlgumaRota = useMemo(
    () => rotas.some((rota) => rota.pedidoIds.some((id) => pedidosSelecionadosIds.has(id))),
    [rotas, pedidosSelecionadosIds]
  );

  const pedidosAtribuidos = rotas.reduce((soma, rota) => soma + rota.pedidoIds.length, 0);
  const kmOtimizadosTotal = rotas.reduce(
    (soma, rota) => soma + (rota.resultado?.distanciaOtimizadaKm ?? 0),
    0
  );

  function limparDesenhoESelecao() {
    setModoDesenho(false);
    setPontosPoligono([]);
    setAcaoRapida(null);
  }

  async function recalcularRota(rotaId: string, pedidoIds: string[]) {
    if (pedidoIds.length === 0) {
      setRotas((atual) =>
        atual.map((rota) => (rota.id === rotaId ? { ...rota, resultado: null, status: 'rascunho' } : rota))
      );
      return;
    }

    setRotas((atual) =>
      atual.map((rota) => (rota.id === rotaId ? { ...rota, status: 'calculando' } : rota))
    );

    const pedidosDaRota = pedidoIds
      .map((id) => pedidosPorId.get(id))
      .filter((p): p is Pedido => Boolean(p));

    try {
      const resultado = await otimizarMutation.mutateAsync({ origem: DEPOSITO, pedidos: pedidosDaRota });
      setRotas((atual) =>
        atual.map((rota) => (rota.id === rotaId ? { ...rota, resultado, status: 'calculada' } : rota))
      );
    } catch (error) {
      setRotas((atual) =>
        atual.map((rota) => (rota.id === rotaId ? { ...rota, status: 'erro' } : rota))
      );
      toast.error(getErrorMessage(error, 'Não foi possível recalcular uma das rotas.'));
    }
  }

  // Sequencial (não Promise.all) — evita rajada simultânea de chamadas à
  // ORS, que tem limite de requisições por minuto no plano gratuito.
  async function recalcularRotasAfetadas(antes: RotaSimulada[], depois: RotaSimulada[]) {
    for (const rotaId of rotasAfetadas(antes, depois)) {
      const rota = depois.find((r) => r.id === rotaId);
      if (!rota) continue;
      await recalcularRota(rotaId, rota.pedidoIds);
    }
  }

  function handleGerarPedidos() {
    setPedidos(gerarPedidos(quantidade));
    setRotas([]);
    setRotaEmFocoId(null);
    limparDesenhoESelecao();
  }

  function handleIniciarDesenho() {
    setModoDesenho(true);
    setPontosPoligono([]);
  }

  function handleCancelarDesenho() {
    limparDesenhoESelecao();
  }

  function handleCliqueMapa(ponto: Coordenada) {
    setPontosPoligono((atual) => [...atual, ponto]);
  }

  function handleFinalizarPoligono() {
    const selecionados = Array.from(pedidosSelecionadosIds);

    if (selecionados.length === 0) {
      toast.error('Nenhum pedido dentro do polígono desenhado.');
      limparDesenhoESelecao();
      return;
    }

    if (acaoRapida) {
      const antes = rotas;
      let depois: RotaSimulada[];

      if (acaoRapida.tipo === 'atribuir') {
        depois = atribuirPedidos(antes, acaoRapida.rotaId, selecionados);
      } else {
        const rotaAlvo = antes.find((r) => r.id === acaoRapida.rotaId);
        const idsDaRotaAlvo = selecionados.filter((id) => rotaAlvo?.pedidoIds.includes(id));
        const ignorados = selecionados.length - idsDaRotaAlvo.length;
        depois = desatribuirPedidos(antes, idsDaRotaAlvo, acaoRapida.rotaId);
        if (ignorados > 0) {
          toast(`${ignorados} pedido(s) selecionado(s) não pertenciam a essa rota e foram ignorados.`);
        }
      }

      setRotas(depois);
      void recalcularRotasAfetadas(antes, depois);
      limparDesenhoESelecao();
      return;
    }

    // Encerra o desenho, mas mantém a seleção visível pra mostrar a barra de ação.
    setModoDesenho(false);
  }

  function handleCriarRotaDaSelecao() {
    const antes = rotas;
    const depois = criarRota(antes, Array.from(pedidosSelecionadosIds));
    setRotas(depois);
    void recalcularRotasAfetadas(antes, depois);
    limparDesenhoESelecao();
  }

  function handleAtribuirASelecao(rotaId: string) {
    const antes = rotas;
    const depois = atribuirPedidos(antes, rotaId, Array.from(pedidosSelecionadosIds));
    setRotas(depois);
    void recalcularRotasAfetadas(antes, depois);
    limparDesenhoESelecao();
  }

  function handleDesatribuirSelecao() {
    const antes = rotas;
    const depois = desatribuirPedidos(antes, Array.from(pedidosSelecionadosIds));
    setRotas(depois);
    void recalcularRotasAfetadas(antes, depois);
    limparDesenhoESelecao();
  }

  function handleSelecionarRota(rotaId: string) {
    setRotaEmFocoId((atual) => (atual === rotaId ? null : rotaId));
  }

  function handleSalvarNome(rotaId: string, nome: string) {
    setRotas((atual) => renomearRota(atual, rotaId, nome));
    setEditando(null);
    toast.success('Rota renomeada.');
  }

  function handleRecalcularLinha(rotaId: string) {
    const rota = rotas.find((r) => r.id === rotaId);
    if (!rota) return;
    void recalcularRota(rotaId, rota.pedidoIds);
  }

  function handleAtribuirPedidosLinha(rotaId: string) {
    setAcaoRapida({ rotaId, tipo: 'atribuir' });
    setModoDesenho(true);
    setPontosPoligono([]);
  }

  function handleDesatribuirPedidosLinha(rotaId: string) {
    setAcaoRapida({ rotaId, tipo: 'desatribuir' });
    setModoDesenho(true);
    setPontosPoligono([]);
  }

  function handleConfirmarExclusao() {
    if (!excluindo) return;
    setRotas((atual) => excluirRota(atual, excluindo.id));
    if (rotaEmFocoId === excluindo.id) setRotaEmFocoId(null);
    toast.success('Rota excluída.');
    setExcluindo(null);
  }

  const acaoRapidaRota = acaoRapida ? rotas.find((r) => r.id === acaoRapida.rotaId) : undefined;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Otimização de Rotas</h1>
        <p className="text-muted-foreground text-sm">
          Simule pedidos ao redor do centro de distribuição, desenhe um polígono no mapa pra
          selecioná-los por região e organize-os em rotas.
        </p>
      </div>

      <div className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="quantidade-pedidos">Quantidade de pedidos</Label>
          <Input
            id="quantidade-pedidos"
            type="number"
            min={1}
            max={QUANTIDADE_MAXIMA}
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            className="w-32"
          />
        </div>

        <Button type="button" variant="outline" onClick={handleGerarPedidos}>
          <Sparkles className="w-4 h-4 mr-2" />
          Gerar Pedidos
        </Button>

        {pedidos.length > 0 && !modoDesenho && (
          <Button type="button" variant="outline" onClick={handleIniciarDesenho}>
            <LassoSelect className="w-4 h-4 mr-2" />
            Desenhar Polígono
          </Button>
        )}

        {modoDesenho && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {acaoRapida
                ? `Desenhando pra ${acaoRapida.tipo === 'atribuir' ? 'atribuir pedidos à' : 'desatribuir pedidos de'} "${acaoRapidaRota?.nome}"`
                : 'Clique no mapa pra adicionar pontos do polígono.'}
            </span>
            <Button type="button" size="sm" onClick={handleFinalizarPoligono} disabled={pontosPoligono.length < 3}>
              Finalizar Polígono ({pontosPoligono.length})
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleCancelarDesenho}>
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
          <Button type="button" size="sm" onClick={handleCriarRotaDaSelecao}>
            Criar rota
          </Button>
          {rotas.length > 0 && (
            <Select onValueChange={handleAtribuirASelecao}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Atribuir à rota existente" />
              </SelectTrigger>
              <SelectContent>
                {rotas.map((rota) => (
                  <SelectItem key={rota.id} value={rota.id}>
                    {rota.nome}
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
            disabled={!selecaoTocaAlgumaRota}
          >
            Desatribuir
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={limparDesenhoESelecao}>
            Cancelar seleção
          </Button>
        </div>
      )}

      {pedidos.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Gere pedidos simulados para começar.
        </div>
      ) : (
        <>
          <OtimizacaoRotasMapa
            origem={DEPOSITO}
            todosPedidos={pedidos}
            rotas={rotas}
            pedidosSelecionadosIds={pedidosSelecionadosIds}
            rotaEmFocoId={rotaEmFocoId}
            modoDesenho={modoDesenho}
            pontosPoligono={pontosPoligono}
            onCliqueMapa={handleCliqueMapa}
          />

          <p className="text-sm text-muted-foreground">
            {rotas.length} rota(s) · {pedidosAtribuidos}/{pedidos.length} pedidos atribuídos ·{' '}
            {kmOtimizadosTotal.toFixed(1)} km otimizados no total
          </p>

          <RotasSimuladasTable
            rotas={rotas}
            pedidos={pedidos}
            rotaEmFocoId={rotaEmFocoId}
            onSelecionar={handleSelecionarRota}
            onEditar={setEditando}
            onRecalcular={handleRecalcularLinha}
            onAtribuirPedidos={handleAtribuirPedidosLinha}
            onDesatribuirPedidos={handleDesatribuirPedidosLinha}
            onExcluir={setExcluindo}
          />
        </>
      )}

      <RenomearRotaModal rota={editando} onSalvar={handleSalvarNome} onFechar={() => setEditando(null)} />

      <ConfirmDialog
        open={!!excluindo}
        title="Excluir rota"
        description={`Tem certeza que deseja excluir a rota "${excluindo?.nome}"? Os pedidos dela voltam a ficar não atribuídos.`}
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
