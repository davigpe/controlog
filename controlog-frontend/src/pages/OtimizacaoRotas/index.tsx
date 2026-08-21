import { useState } from 'react';
import { Sparkles, Route as RouteIcon, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/api';
import { DEPOSITO, gerarPedidos } from './gerarPedidos';
import { useOtimizarRota } from './api';
import OtimizacaoRotasMapa from './OtimizacaoRotasMapa';
import type { ParadaOtimizada, Pedido } from './types';

const QUANTIDADE_PADRAO = 12;
const QUANTIDADE_MAXIMA = 50;

export default function OtimizacaoRotas() {
  const [quantidade, setQuantidade] = useState(QUANTIDADE_PADRAO);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  const otimizarMutation = useOtimizarRota();

  function handleGerarPedidos() {
    setPedidos(gerarPedidos(quantidade));
    otimizarMutation.reset();
  }

  function handleOtimizar() {
    otimizarMutation.mutate(
      { origem: DEPOSITO, pedidos },
      {
        onSuccess: () => toast.success('Rota otimizada com sucesso.'),
        onError: (error) => toast.error(getErrorMessage(error, 'Não foi possível otimizar a rota.')),
      }
    );
  }

  const resultado = otimizarMutation.data;
  const linhas: (Pedido | ParadaOtimizada)[] = resultado?.ordem ?? pedidos;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Otimização de Rotas</h1>
        <p className="text-muted-foreground text-sm">
          Simule pedidos ao redor do centro de distribuição e calcule a melhor ordem de entrega.
        </p>
      </div>

      <div className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-end gap-4">
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

        <Button type="button" onClick={handleOtimizar} disabled={pedidos.length === 0 || otimizarMutation.isPending}>
          <RouteIcon className="w-4 h-4 mr-2" />
          {otimizarMutation.isPending ? 'Otimizando...' : 'Otimizar Rota'}
        </Button>
      </div>

      {pedidos.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Gere pedidos simulados para começar.
        </div>
      ) : (
        <>
          {resultado && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-green-50 border-green-100 p-4">
                <p className="text-2xl font-bold text-green-600">{resultado.distanciaOtimizadaKm.toFixed(1)} km</p>
                <p className="text-sm mt-1 text-gray-700">Distância otimizada</p>
              </div>
              <div className="rounded-xl border bg-gray-50 border-gray-100 p-4">
                <p className="text-2xl font-bold text-gray-500">{resultado.distanciaOriginalKm.toFixed(1)} km</p>
                <p className="text-sm mt-1 text-gray-700">Distância sem otimização</p>
              </div>
              <div className="rounded-xl border bg-blue-50 border-blue-100 p-4 flex items-center gap-3">
                <TrendingDown className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{resultado.economiaPercentual.toFixed(1)}%</p>
                  <p className="text-sm text-gray-700">de economia na distância</p>
                </div>
              </div>
            </div>
          )}

          <OtimizacaoRotasMapa
            origem={DEPOSITO}
            pedidos={pedidos}
            ordem={resultado?.ordem}
            rotaReal={resultado?.rotaReal}
          />

          {resultado &&
            (resultado.rotaReal ? (
              <div className="rounded-lg border bg-indigo-50 border-indigo-100 p-4 text-sm text-gray-700">
                <span className="font-semibold text-indigo-700">
                  {resultado.rotaReal.distanciaRealKm.toFixed(1)} km pelas ruas
                </span>{' '}
                (~{Math.round(resultado.rotaReal.duracaoMinutos)} min de condução) — traçado real via
                OpenRouteService. As distâncias acima são a estimativa em linha reta usada pra calcular
                a ordem de entrega.
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Traçado real pelas ruas indisponível no momento — exibindo estimativa em linha reta no
                mapa.
              </p>
            ))}

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Endereço</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((pedido, indice) => (
                  <tr key={pedido.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{'posicao' in pedido ? pedido.posicao : indice + 1}</td>
                    <td className="px-4 py-3">{pedido.endereco}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
