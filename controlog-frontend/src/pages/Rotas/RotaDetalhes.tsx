import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Rota } from './types';
import RotaMapa from './RotaMapa';

const statusConfig = {
  ATIVA: { label: 'Ativa', className: 'bg-green-100 text-green-700' },
  CONCLUIDA: { label: 'Concluída', className: 'bg-blue-100 text-blue-700' },
  CANCELADA: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
};

interface Props {
  rota: Rota | null;
  open: boolean;
  onClose: () => void;
}

export default function RotaDetalhes({ rota, open, onClose }: Props) {
  if (!rota) return null;

  const status = statusConfig[rota.status];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Rota — {rota.codigo}</DialogTitle>
          <DialogDescription className="sr-only">
            Detalhes da rota {rota.codigo}, de {rota.origem} para {rota.destino}, com mapa de origem e destino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Origem</span>
              <p className="font-medium">{rota.origem}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Destino</span>
              <p className="font-medium">{rota.destino}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Motorista</span>
              <p className="font-medium">{rota.motorista.nome}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Veículo</span>
              <p className="font-medium">{rota.veiculo.modelo} — {rota.veiculo.placa}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <div className="mt-1">
                <Badge className={status.className}>{status.label}</Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Data/Hora</span>
              <p className="font-medium">
                {format(new Date(rota.dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <RotaMapa rota={rota} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
