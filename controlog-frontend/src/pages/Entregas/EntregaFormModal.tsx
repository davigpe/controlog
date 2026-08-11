import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMotoristas } from '@/pages/Motoristas/api';
import { useRotas } from '@/pages/Rotas/api';
import type { Entrega, StatusEntrega } from './types';

interface FormData {
  codigo: string;
  rotaId: string;
  motoristaId: string;
  destino: string;
  status: StatusEntrega;
  dataPrevista: string;
}

interface Props {
  open: boolean;
  entregaEditando: Entrega | null;
  onClose: () => void;
  onSave: (data: FormData) => void;
  saving?: boolean;
}

export default function EntregaFormModal({ open, entregaEditando, onClose, onSave, saving }: Props) {
  const { data: rotas = [] } = useRotas();
  const { data: motoristas = [] } = useMotoristas();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    if (entregaEditando) {
      reset({
        codigo: entregaEditando.codigo,
        rotaId: entregaEditando.rota.id,
        motoristaId: entregaEditando.motorista.id,
        destino: entregaEditando.destino,
        status: entregaEditando.status,
        dataPrevista: entregaEditando.dataPrevista.slice(0, 10),
      });
    } else {
      reset({
        codigo: '', rotaId: '', motoristaId: '', destino: '',
        status: 'PENDENTE', dataPrevista: new Date().toISOString().slice(0, 10),
      });
    }
  }, [entregaEditando, open, reset]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{entregaEditando ? 'Editar Entrega' : 'Nova Entrega'}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para {entregaEditando ? 'editar os dados de uma' : 'cadastrar uma nova'} entrega.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="entrega-codigo">Código</Label>
              <Input id="entrega-codigo" {...register('codigo', { required: true })} placeholder="EN-001" />
              {errors.codigo && <p className="text-xs text-red-600">Campo obrigatório</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="entrega-destino">Destino</Label>
              <Input id="entrega-destino" {...register('destino', { required: true })} placeholder="Florianópolis, SC" />
              {errors.destino && <p className="text-xs text-red-600">Campo obrigatório</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="entrega-rota">Rota vinculada</Label>
            <Select value={watch('rotaId')} onValueChange={(v) => setValue('rotaId', v)}>
              <SelectTrigger id="entrega-rota" className="w-full">
                <SelectValue placeholder="Selecione a rota" />
              </SelectTrigger>
              <SelectContent>
                {rotas.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.codigo} — {r.origem} → {r.destino}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="entrega-motorista">Motorista</Label>
              <Select value={watch('motoristaId')} onValueChange={(v) => setValue('motoristaId', v)}>
                <SelectTrigger id="entrega-motorista" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {motoristas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="entrega-data-prevista">Data prevista</Label>
              <Input id="entrega-data-prevista" type="date" {...register('dataPrevista', { required: true })} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="entrega-status">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v as StatusEntrega)}
            >
              <SelectTrigger id="entrega-status" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="EM_TRANSITO">Em Trânsito</SelectItem>
                <SelectItem value="ENTREGUE">Entregue</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : entregaEditando ? 'Salvar' : 'Criar Entrega'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
