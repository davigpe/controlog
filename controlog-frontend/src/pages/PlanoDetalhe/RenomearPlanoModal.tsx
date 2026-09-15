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

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe um nome para o plano.'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  nomeAtual: string;
  saving?: boolean;
  onSalvar: (nome: string) => void;
  onFechar: () => void;
}

export default function RenomearPlanoModal({ open, nomeAtual, saving, onSalvar, onFechar }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset({ nome: nomeAtual });
  }, [open, nomeAtual, reset]);

  const onSubmit = (data: FormData) => onSalvar(data.nome);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onFechar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Renomear plano</DialogTitle>
          <DialogDescription className="sr-only">Formulário para renomear o plano.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="plano-detalhe-nome">Nome</Label>
            <Input id="plano-detalhe-nome" {...register('nome')} autoFocus />
            {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
