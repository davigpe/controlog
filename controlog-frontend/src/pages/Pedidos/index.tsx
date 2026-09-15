import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { getErrorMessage } from '@/lib/api';
import { useCriarPlano, useGerarPedidos, usePedidos } from './api';
import NomePlanoModal from './NomePlanoModal';

const QUANTIDADE_PADRAO = 20;
const QUANTIDADE_MAXIMA = 200;

export default function Pedidos() {
  const [quantidade, setQuantidade] = useState(QUANTIDADE_PADRAO);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modalAberto, setModalAberto] = useState(false);

  const { data, isLoading } = usePedidos({ disponivel: true, pageSize: 100 });
  const gerarMutation = useGerarPedidos();
  const criarPlanoMutation = useCriarPlano();

  const pedidos = data?.items ?? [];
  const todosSelecionados = pedidos.length > 0 && selecionados.size === pedidos.length;

  function handleGerar() {
    gerarMutation.mutate(quantidade, {
      onSuccess: () => toast.success(`${quantidade} pedido(s) gerado(s).`),
      onError: (error) => toast.error(getErrorMessage(error, 'Não foi possível gerar pedidos.')),
    });
  }

  function toggleSelecionado(id: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function toggleTodos() {
    setSelecionados(todosSelecionados ? new Set() : new Set(pedidos.map((p) => p.id)));
  }

  function handleCriarPlano(nome: string) {
    criarPlanoMutation.mutate(
      { nome, pedidoIds: Array.from(selecionados) },
      {
        onSuccess: () => {
          toast.success('Plano criado.');
          setSelecionados(new Set());
          setModalAberto(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Não foi possível criar o plano.')),
      }
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground text-sm">
          Gere pedidos fictícios e selecione quais entram no próximo plano de entrega.
        </p>
      </div>

      <div className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="quantidade-pedidos">Quantidade a gerar</Label>
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

        <Button type="button" variant="outline" onClick={handleGerar} disabled={gerarMutation.isPending}>
          <Sparkles className="w-4 h-4 mr-2" />
          {gerarMutation.isPending ? 'Gerando...' : 'Gerar Pedidos Aleatórios'}
        </Button>
      </div>

      {selecionados.size > 0 && (
        <div className="rounded-lg border bg-amber-50 border-amber-100 p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-amber-800">
            {selecionados.size} pedido(s) selecionado(s)
          </span>
          <Button type="button" size="sm" onClick={() => setModalAberto(true)}>
            Criar Plano
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelecionados(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <Checkbox
                  checked={todosSelecionados}
                  onCheckedChange={toggleTodos}
                  aria-label="Selecionar todos os pedidos"
                  disabled={pedidos.length === 0}
                />
              </th>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Endereço</th>
              <th className="px-4 py-3 text-left">Cidade</th>
              <th className="px-4 py-3 text-left">Unidades</th>
              <th className="px-4 py-3 text-left">Volume</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            ) : pedidos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum pedido disponível — gere alguns pra começar.
                </td>
              </tr>
            ) : (
              pedidos.map((pedido) => (
                <tr key={pedido.id} className="border-t hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selecionados.has(pedido.id)}
                      onCheckedChange={() => toggleSelecionado(pedido.id)}
                      aria-label={`Selecionar pedido ${pedido.codigo}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{pedido.codigo}</td>
                  <td className="px-4 py-3">{pedido.cliente}</td>
                  <td className="px-4 py-3">{pedido.endereco}</td>
                  <td className="px-4 py-3">{pedido.cidade}</td>
                  <td className="px-4 py-3">{pedido.unidades}</td>
                  <td className="px-4 py-3">{pedido.volumeM3.toFixed(2)} m³</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NomePlanoModal
        open={modalAberto}
        totalPedidos={selecionados.size}
        saving={criarPlanoMutation.isPending}
        onConfirmar={handleCriarPlano}
        onFechar={() => setModalAberto(false)}
      />
    </div>
  );
}
