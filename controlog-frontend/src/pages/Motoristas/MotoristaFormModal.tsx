import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Motorista, StatusMotorista } from './types';

const schema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome completo.'),
  cnh: z.string().trim().min(5, 'Número de CNH inválido.'),
  telefone: z.string().trim().min(8, 'Telefone inválido.'),
  status: z.enum(['ATIVO', 'INATIVO']),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  motoristaEditando: Motorista | null;
  onClose: () => void;
  onSave: (data: FormData) => void;
  saving?: boolean;
}

export default function MotoristaFormModal({ open, motoristaEditando, onClose, onSave, saving }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { status: 'ATIVO' } });

  useEffect(() => {
    if (motoristaEditando) {
      reset({
        nome: motoristaEditando.nome,
        cnh: motoristaEditando.cnh,
        telefone: motoristaEditando.telefone,
        status: motoristaEditando.status,
      });
    } else {
      reset({ nome: '', cnh: '', telefone: '', status: 'ATIVO' });
    }
  }, [motoristaEditando, open, reset]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{motoristaEditando ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para {motoristaEditando ? 'editar os dados de um' : 'cadastrar um novo'} motorista.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="motorista-nome">Nome completo</Label>
            <Input id="motorista-nome" {...register('nome')} placeholder="Nome do motorista" />
            {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="motorista-cnh">CNH</Label>
              <Input id="motorista-cnh" {...register('cnh')} placeholder="00000000000" />
              {errors.cnh && <p className="text-xs text-red-600">{errors.cnh.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="motorista-telefone">Telefone</Label>
              <Input id="motorista-telefone" {...register('telefone')} placeholder="(47) 99999-9999" />
              {errors.telefone && <p className="text-xs text-red-600">{errors.telefone.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="motorista-status">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v as StatusMotorista)}
            >
              <SelectTrigger id="motorista-status" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="INATIVO">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : motoristaEditando ? 'Salvar' : 'Criar Motorista'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
