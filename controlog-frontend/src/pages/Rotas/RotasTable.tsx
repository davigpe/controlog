import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Rota } from './types';

const statusConfig = {
  ATIVA: { label: 'Ativa', className: 'bg-green-100 text-green-700' },
  CONCLUIDA: { label: 'Concluída', className: 'bg-blue-100 text-blue-700' },
  CANCELADA: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
};

interface Props {
  rotas: Rota[];
  onVerDetalhes: (rota: Rota) => void;
  onEditar: (rota: Rota) => void;
  onExcluir: (rota: Rota) => void;
}

export default function RotasTable({ rotas, onVerDetalhes, onEditar, onExcluir }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Código</th>
            <th className="px-4 py-3 text-left">Origem → Destino</th>
            <th className="px-4 py-3 text-left">Motorista</th>
            <th className="px-4 py-3 text-left">Veículo</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Data/Hora</th>
            <th className="px-4 py-3 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rotas.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-8 text-muted-foreground">
                Nenhuma rota encontrada.
              </td>
            </tr>
          ) : (
            rotas.map((rota) => {
              const status = statusConfig[rota.status];
              return (
                <tr key={rota.id} className="border-t hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-medium">{rota.codigo}</td>
                  <td className="px-4 py-3">{rota.origem} → {rota.destino}</td>
                  <td className="px-4 py-3">{rota.motorista.nome}</td>
                  <td className="px-4 py-3">{rota.veiculo.modelo} — {rota.veiculo.placa}</td>
                  <td className="px-4 py-3">
                    <Badge className={status.className}>{status.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {format(new Date(rota.dataHora), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <Button size="icon" variant="ghost" aria-label={`Ver detalhes de ${rota.codigo}`} onClick={() => onVerDetalhes(rota)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={`Editar ${rota.codigo}`} onClick={() => onEditar(rota)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Excluir ${rota.codigo}`}
                        className="text-red-500 hover:text-red-600"
                        onClick={() => onExcluir(rota)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
