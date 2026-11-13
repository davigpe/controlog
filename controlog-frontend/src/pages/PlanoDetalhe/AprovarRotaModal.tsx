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
import {
  motoristaParaPayload,
  SEM_DEFINICAO,
  VALOR_A_DEFINIR,
  VALOR_VEICULO_PROPRIO,
  veiculoParaPayload,
  VEICULO_PROPRIO,
} from '@/pages/Rotas/apresentacao';

// Motorista e veículo deixaram de ser obrigatórios: a rota pode ser aprovada
// antes de se saber quem dirige, e a definição acontece depois, na tela de
// Atribuição de Rotas. Antes era preciso escolher alguém só para destravar a
// aprovação — e trocar em seguida, sem registro de que fora provisório.
const schema = z.object({
  motoristaId: z.string().uuid('Selecione um motorista válido.').nullable(),
  veiculoId: z.string().uuid('Selecione um veículo válido.').nullable(),
  veiculoProprio: z.boolean(),
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
      reset({
        motoristaId: null,
        veiculoId: null,
        veiculoProprio: false,
        dataHora: new Date().toISOString().slice(0, 16),
      });
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
            <Select
              value={watch('motoristaId') ?? VALOR_A_DEFINIR}
              onValueChange={(v) => setValue('motoristaId', motoristaParaPayload(v))}
            >
              <SelectTrigger id="aprovar-motorista" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VALOR_A_DEFINIR}>{SEM_DEFINICAO}</SelectItem>
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
            <Select
              value={
                watch('veiculoProprio')
                  ? VALOR_VEICULO_PROPRIO
                  : (watch('veiculoId') ?? VALOR_A_DEFINIR)
              }
              onValueChange={(v) => {
                const { veiculoId, veiculoProprio } = veiculoParaPayload(v);
                // Os dois de uma vez: a API representa os três estados em dois
                // campos, e gravar só um deixaria a combinação que o banco
                // recusa (próprio junto com veículo da frota).
                setValue('veiculoId', veiculoId);
                setValue('veiculoProprio', veiculoProprio);
              }}
            >
              <SelectTrigger id="aprovar-veiculo" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VALOR_A_DEFINIR}>{SEM_DEFINICAO}</SelectItem>
                {/* Não é da frota: não consome disponibilidade nem aparece nos
                    relatórios de uso de veículo. */}
                <SelectItem value={VALOR_VEICULO_PROPRIO}>{VEICULO_PROPRIO}</SelectItem>
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

          {(!watch('motoristaId') || (!watch('veiculoId') && !watch('veiculoProprio'))) && (
            <p className="text-xs text-gray-600">
              Você pode aprovar agora e definir o restante depois, em Atribuição de Rotas.
            </p>
          )}

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
