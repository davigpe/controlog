import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Rota, StatusRota } from './types';

type FormData = Omit<Rota, 'id' | 'coordenadasOrigem' | 'coordenadasDestino'>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormData) => void;
  rotaEditando: Rota | null;
}

export default function RotaModal({ open, onClose, onSave, rotaEditando }: Props) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>();

  useEffect(() => {
    if (rotaEditando) {
      reset({
        codigo: rotaEditando.codigo,
        origem: rotaEditando.origem,
        destino: rotaEditando.destino,
        motorista: rotaEditando.motorista,
        veiculo: rotaEditando.veiculo,
        status: rotaEditando.status,
        dataHora: rotaEditando.dataHora.slice(0, 16),
      });
    } else {
      reset({
        status: 'ativa',
        dataHora: new Date().toISOString().slice(0, 16),
      });
    }
  }, [rotaEditando, open]);

  const onSubmit = (data: FormData) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rotaEditando ? 'Editar Rota' : 'Nova Rota'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Código</Label>
              <Input {...register('codigo', { required: true })} placeholder="RT-001" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                defaultValue={watch('status')}
                onValueChange={(v) => setValue('status', v as StatusRota)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <Input {...register('origem', { required: true })} placeholder="Joinville, SC" />
            </div>
            <div className="space-y-1">
              <Label>Destino</Label>
              <Input {...register('destino', { required: true })} placeholder="Florianópolis, SC" />
            </div>
            <div className="space-y-1">
              <Label>Motorista</Label>
              <Input {...register('motorista', { required: true })} placeholder="Nome do motorista" />
            </div>
            <div className="space-y-1">
              <Label>Veículo</Label>
              <Input {...register('veiculo', { required: true })} placeholder="Modelo - Placa" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Data/Hora</Label>
              <Input type="datetime-local" {...register('dataHora', { required: true })} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{rotaEditando ? 'Salvar' : 'Criar Rota'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
