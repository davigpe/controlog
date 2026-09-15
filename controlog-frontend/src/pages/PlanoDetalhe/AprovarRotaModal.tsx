import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMotoristas } from '@/pages/Motoristas/api';
import { useVeiculos } from '@/pages/Veiculos/api';

const schema = z.object({
  motoristaId: z.string().uuid('Selecione um motorista.'),
  veiculoId: z.string().uuid('Selecione um veículo.'),
  dataHora: z.string().min(1, 'Informe a data/hora.'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  rotaIndice: number;
  totalPedidos: number;
  saving?: boolean;
  onConfirmar: (dados: FormData) => void;
  onFechar: () => void;
}

export default function AprovarRotaModal({
  open,
  rotaIndice,
  totalPedidos,
  saving,
  onConfirmar,
  onFechar,
}: Props) {
  const { data: motoristasData } = useMotoristas({ pageSize: 100 });
  const { data: veiculosData } = useVeiculos({ pageSize: 100 });
  const motoristas = motoristasData?.items ?? [];
  const veiculos = veiculosData?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({ motoristaId: '', veiculoId: '', dataHora: new Date().toISOString().slice(0, 16) });
    }
  }, [open, reset]);

  const onSubmit = (data: FormData) => onConfirmar(data);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Aprovar Rota {rotaIndice}</DialogTitle>
          <DialogDescription>
            {totalPedidos} pedido(s) vão virar uma rota real, com uma entrega vinculada pra cada um.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="aprovar-motorista">Motorista</Label>
            <Select value={watch('motoristaId')} onValueChange={(v) => setValue('motoristaId', v)}>
              <SelectTrigger id="aprovar-motorista" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {motoristas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.motoristaId && <p className="text-xs text-red-600">{errors.motoristaId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="aprovar-veiculo">Veículo</Label>
            <Select value={watch('veiculoId')} onValueChange={(v) => setValue('veiculoId', v)}>
              <SelectTrigger id="aprovar-veiculo" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {veiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.modelo} — {v.placa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.veiculoId && <p className="text-xs text-red-600">{errors.veiculoId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="aprovar-data-hora">Data/Hora</Label>
            <Input id="aprovar-data-hora" type="datetime-local" {...register('dataHora')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Aprovando...' : 'Aprovar Rota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
