import { Eye, Loader2, MapPin, MoreVertical, Pencil, RotateCw, Trash2, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { RotaSimulada, StatusRotaSimulada } from './rotasSimuladas';
import type { Pedido } from './types';

const statusConfig: Record<StatusRotaSimulada, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
  calculando: { label: 'Calculando...', className: 'bg-blue-100 text-blue-700' },
  calculada: { label: 'Calculada', className: 'bg-green-100 text-green-700' },
  erro: { label: 'Erro', className: 'bg-red-100 text-red-700' },
};

interface Props {
  rotas: RotaSimulada[];
  /** Lista mestre de pedidos — unidades/volume são somados olhando aqui, nunca em resultado.ordem. */
  pedidos: Pedido[];
  rotaEmFocoId: string | null;
  onSelecionar: (rotaId: string) => void;
  onEditar: (rota: RotaSimulada) => void;
  onRecalcular: (rotaId: string) => void;
  onAtribuirPedidos: (rotaId: string) => void;
  onDesatribuirPedidos: (rotaId: string) => void;
  onExcluir: (rota: RotaSimulada) => void;
}

export default function RotasSimuladasTable({
  rotas,
  pedidos,
  rotaEmFocoId,
  onSelecionar,
  onEditar,
  onRecalcular,
  onAtribuirPedidos,
  onDesatribuirPedidos,
  onExcluir,
}: Props) {
  const pedidosPorId = new Map(pedidos.map((p) => [p.id, p]));

  function agregados(rota: RotaSimulada) {
    let unidades = 0;
    let volumeM3 = 0;
    for (const id of rota.pedidoIds) {
      const pedido = pedidosPorId.get(id);
      if (!pedido) continue;
      unidades += pedido.unidades;
      volumeM3 += pedido.volumeM3;
    }
    return { unidades, volumeM3 };
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Rota</th>
            <th className="px-4 py-3 text-left">Veículo</th>
            <th className="px-4 py-3 text-left">Pedidos</th>
            <th className="px-4 py-3 text-left">Unidades</th>
            <th className="px-4 py-3 text-left">Volume</th>
            <th className="px-4 py-3 text-left">Tempo estimado</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rotas.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-8 text-muted-foreground">
                Nenhuma rota criada ainda. Desenhe um polígono no mapa pra começar.
              </td>
            </tr>
          ) : (
            rotas.map((rota) => {
              const status = statusConfig[rota.status];
              const { unidades, volumeM3 } = agregados(rota);
              const tempo = rota.resultado?.rotaReal
                ? `${Math.round(rota.resultado.rotaReal.duracaoMinutos)} min`
                : '—';
              const emFoco = rotaEmFocoId === rota.id;

              return (
                <tr
                  key={rota.id}
                  className={`border-t hover:bg-muted/40 transition-colors cursor-pointer ${emFoco ? 'bg-muted/60' : ''}`}
                  onClick={() => onSelecionar(rota.id)}
                >
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: rota.cor }}
                        aria-hidden="true"
                      />
                      {rota.nome}
                    </span>
                  </td>
                  <td className="px-4 py-3">{rota.veiculo}</td>
                  <td className="px-4 py-3">{rota.pedidoIds.length}</td>
                  <td className="px-4 py-3">{unidades}</td>
                  <td className="px-4 py-3">{volumeM3.toFixed(2)} m³</td>
                  <td className="px-4 py-3">{tempo}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}
                    >
                      {rota.status === 'calculando' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label={`Ações de ${rota.nome}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelecionar(rota.id)}>
                          <Eye className="w-4 h-4" /> Ver no mapa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditar(rota)}>
                          <Pencil className="w-4 h-4" /> Editar nome
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onRecalcular(rota.id)}
                          disabled={rota.pedidoIds.length === 0}
                        >
                          <RotateCw className="w-4 h-4" /> Recalcular
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAtribuirPedidos(rota.id)}>
                          <MapPin className="w-4 h-4" /> Atribuir pedidos
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDesatribuirPedidos(rota.id)}
                          disabled={rota.pedidoIds.length === 0}
                        >
                          <UserMinus className="w-4 h-4" /> Desatribuir pedidos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onExcluir(rota)}>
                          <Trash2 className="w-4 h-4" /> Excluir rota
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
