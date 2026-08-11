import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMotoristas } from '@/pages/Motoristas/api';
import { useVeiculos } from '@/pages/Veiculos/api';
import type { Rota, StatusRota } from './types';

const schema = z.object({
  codigo: z.string().trim().min(3, 'Código deve ter ao menos 3 caracteres.'),
  origem: z.string().trim().min(2, 'Informe a origem.'),
  destino: z.string().trim().min(2, 'Informe o destino.'),
  motoristaId: z.string().uuid('Selecione um motorista.'),
  veiculoId: z.string().uuid('Selecione um veículo.'),
  dataHora: z.string().min(1, 'Informe a data/hora.'),
  status: z.enum(['ATIVA', 'CONCLUIDA', 'CANCELADA']),
  latOrigem: z.number(),
  lngOrigem: z.number(),
  latDestino: z.number(),
  lngDestino: z.number(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormData) => void;
  rotaEditando: Rota | null;
  saving?: boolean;
}

export default function RotaModal({ open, onClose, onSave, rotaEditando, saving }: Props) {
  const { data: motoristas = [] } = useMotoristas();
  const { data: veiculos = [] } = useVeiculos();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (rotaEditando) {
      reset({
        codigo: rotaEditando.codigo,
        origem: rotaEditando.origem,
        destino: rotaEditando.destino,
        motoristaId: rotaEditando.motorista.id,
        veiculoId: rotaEditando.veiculo.id,
        status: rotaEditando.status,
        dataHora: rotaEditando.dataHora.slice(0, 16),
        latOrigem: rotaEditando.coordenadasOrigem[0],
        lngOrigem: rotaEditando.coordenadasOrigem[1],
        latDestino: rotaEditando.coordenadasDestino[0],
        lngDestino: rotaEditando.coordenadasDestino[1],
      });
    } else {
      reset({
        status: 'ATIVA',
        dataHora: new Date().toISOString().slice(0, 16),
        codigo: '', origem: '', destino: '', motoristaId: '', veiculoId: '',
        latOrigem: undefined, lngOrigem: undefined, latDestino: undefined, lngDestino: undefined,
      });
    }
  }, [rotaEditando, open, reset]);

  const onSubmit = (data: FormData) => onSave(data);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rotaEditando ? 'Editar Rota' : 'Nova Rota'}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para {rotaEditando ? 'editar os dados de uma' : 'cadastrar uma nova'} rota de entrega.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="rota-codigo">Código</Label>
              <Input id="rota-codigo" {...register('codigo')} placeholder="RT-001" />
              {errors.codigo && <p className="text-xs text-red-600">{errors.codigo.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rota-status">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(v) => setValue('status', v as StatusRota)}
              >
                <SelectTrigger id="rota-status" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVA">Ativa</SelectItem>
                  <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rota-origem">Origem</Label>
              <Input id="rota-origem" {...register('origem')} placeholder="Joinville, SC" />
              {errors.origem && <p className="text-xs text-red-600">{errors.origem.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rota-destino">Destino</Label>
              <Input id="rota-destino" {...register('destino')} placeholder="Florianópolis, SC" />
              {errors.destino && <p className="text-xs text-red-600">{errors.destino.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rota-motorista">Motorista</Label>
              <Select
                value={watch('motoristaId')}
                onValueChange={(v) => setValue('motoristaId', v)}
              >
                <SelectTrigger id="rota-motorista" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {motoristas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.motoristaId && <p className="text-xs text-red-600">{errors.motoristaId.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rota-veiculo">Veículo</Label>
              <Select
                value={watch('veiculoId')}
                onValueChange={(v) => setValue('veiculoId', v)}
              >
                <SelectTrigger id="rota-veiculo" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.modelo} — {v.placa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.veiculoId && <p className="text-xs text-red-600">{errors.veiculoId.message}</p>}
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="rota-data-hora">Data/Hora</Label>
              <Input id="rota-data-hora" type="datetime-local" {...register('dataHora')} />
            </div>
          </div>

          <div className="rounded-lg border border-dashed p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Coordenadas geográficas (latitude/longitude) — usadas para exibir a rota no mapa.
              Consulte em <span className="font-medium">google.com/maps</span> se não souber de cor.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="rota-lat-origem">Latitude origem</Label>
                <Input id="rota-lat-origem" type="number" step="any" {...register('latOrigem', { valueAsNumber: true })} placeholder="-26.3045" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rota-lng-origem">Longitude origem</Label>
                <Input id="rota-lng-origem" type="number" step="any" {...register('lngOrigem', { valueAsNumber: true })} placeholder="-48.8487" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rota-lat-destino">Latitude destino</Label>
                <Input id="rota-lat-destino" type="number" step="any" {...register('latDestino', { valueAsNumber: true })} placeholder="-27.5954" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rota-lng-destino">Longitude destino</Label>
                <Input id="rota-lng-destino" type="number" step="any" {...register('lngDestino', { valueAsNumber: true })} placeholder="-48.548" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : rotaEditando ? 'Salvar' : 'Criar Rota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
