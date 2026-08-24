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
import type { RotaSimulada } from './rotasSimuladas';

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe um nome para a rota.'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  rota: RotaSimulada | null;
  onSalvar: (rotaId: string, nome: string) => void;
  onFechar: () => void;
}

export default function RenomearRotaModal({ rota, onSalvar, onFechar }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (rota) reset({ nome: rota.nome });
  }, [rota, reset]);

  const onSubmit = (data: FormData) => {
    if (!rota) return;
    onSalvar(rota.id, data.nome);
  };

  return (
    <Dialog open={!!rota} onOpenChange={(next) => !next && onFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Renomear rota</DialogTitle>
          <DialogDescription className="sr-only">Formulário para renomear uma rota simulada.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="rota-simulada-nome">Nome</Label>
            <Input id="rota-simulada-nome" {...register('nome')} autoFocus />
            {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
