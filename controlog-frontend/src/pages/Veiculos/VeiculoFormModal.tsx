import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StatusVeiculo, Veiculo } from './types';

const schema = z.object({
  placa: z.string().trim().min(6, 'Placa inválida.'),
  modelo: z.string().trim().min(2, 'Informe o modelo do veículo.'),
  capacidade: z.string().trim().min(1, 'Informe a capacidade de carga.'),
  status: z.enum(['DISPONIVEL', 'MANUTENCAO', 'INATIVO']),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  veiculoEditando: Veiculo | null;
  onClose: () => void;
  onSave: (data: FormData) => void;
  saving?: boolean;
}

export default function VeiculoFormModal({ open, veiculoEditando, onClose, onSave, saving }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { status: 'DISPONIVEL' } });

  useEffect(() => {
    if (veiculoEditando) {
      reset({
        placa: veiculoEditando.placa,
        modelo: veiculoEditando.modelo,
        capacidade: veiculoEditando.capacidade,
        status: veiculoEditando.status,
      });
    } else {
      reset({ placa: '', modelo: '', capacidade: '', status: 'DISPONIVEL' });
    }
  }, [veiculoEditando, open, reset]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{veiculoEditando ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para {veiculoEditando ? 'editar os dados de um' : 'cadastrar um novo'} veículo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="veiculo-placa">Placa</Label>
              <Input id="veiculo-placa" {...register('placa')} placeholder="ABC-1234" />
              {errors.placa && <p className="text-xs text-red-600">{errors.placa.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="veiculo-capacidade">Capacidade</Label>
              <Input id="veiculo-capacidade" {...register('capacidade')} placeholder="Ex: 5.000 kg" />
              {errors.capacidade && <p className="text-xs text-red-600">{errors.capacidade.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="veiculo-modelo">Modelo</Label>
            <Input id="veiculo-modelo" {...register('modelo')} placeholder="Ex: Mercedes-Benz Axor 2544" />
            {errors.modelo && <p className="text-xs text-red-600">{errors.modelo.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="veiculo-status">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v as StatusVeiculo)}
            >
              <SelectTrigger id="veiculo-status" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                <SelectItem value="MANUTENCAO">Manutenção</SelectItem>
                <SelectItem value="INATIVO">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : veiculoEditando ? 'Salvar' : 'Criar Veículo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
