import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  veiculoParaFormulario,
  veiculoParaPayload,
  VEICULO_PROPRIO,
} from '@/pages/Rotas/apresentacao';
import type { Rota } from '@/pages/Rotas/types';

interface Props {
  rota: Rota | null;
  onClose: () => void;
  onSave: (data: {
    motoristaId: string | null;
    veiculoId: string | null;
    veiculoProprio: boolean;
  }) => void;
  saving?: boolean;
}

export default function AtribuirModal({ rota, onClose, onSave, saving }: Props) {
  const valorInicialMotorista = rota?.motorista?.id ?? VALOR_A_DEFINIR;
  const valorInicialVeiculo = rota ? veiculoParaFormulario(rota) : VALOR_A_DEFINIR;

  const [rotaId, setRotaId] = useState(rota?.id);
  const [motoristaId, setMotoristaId] = useState(valorInicialMotorista);
  const [veiculoId, setVeiculoId] = useState(valorInicialVeiculo);

  // Abrir o modal para outra rota recomeça a seleção do zero. Ajuste em render
  // (padrão do React para estado derivado de prop) em vez de useEffect, que
  // renderizaria uma vez com a seleção da rota anterior antes de corrigir.
  if (rota?.id !== rotaId) {
    setRotaId(rota?.id);
    setMotoristaId(valorInicialMotorista);
    setVeiculoId(valorInicialVeiculo);
  }

  // Só motoristas ATIVOS podem receber uma rota — um motorista inativo não
  // está disponível para operar, então nem aparece como opção.
  const { data: motoristasData } = useMotoristas({ status: 'ATIVO', pageSize: 100 });
  const { data: veiculosData } = useVeiculos({ pageSize: 100 });

  const motoristas = motoristasData?.items ?? [];
  const veiculos = veiculosData?.items ?? [];
  const semMudanca =
    motoristaId === valorInicialMotorista && veiculoId === valorInicialVeiculo;

  return (
    <Dialog open={!!rota} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Atribuir {rota?.codigo}</DialogTitle>
          <DialogDescription>
            {rota?.entregasPendentes
              ? `Esta rota tem ${rota.entregasPendentes} entrega(s) pendente(s) — elas passam junto para o novo motorista.`
              : 'Escolha o motorista e o veículo responsáveis por esta rota. Pode deixar qualquer um dos dois para depois.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="atribuir-motorista">Motorista</Label>
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger id="atribuir-motorista" className="w-full">
                <SelectValue placeholder="Selecione o motorista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VALOR_A_DEFINIR}>{SEM_DEFINICAO}</SelectItem>
                {motoristas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                    {m.emRota ? ' — já em rota' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="atribuir-veiculo">Veículo</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger id="atribuir-veiculo" className="w-full">
                <SelectValue placeholder="Selecione o veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VALOR_A_DEFINIR}>{SEM_DEFINICAO}</SelectItem>
                {/* Veículo próprio não é da frota: não consome disponibilidade
                    e não aparece nos relatórios de uso de veículo. */}
                <SelectItem value={VALOR_VEICULO_PROPRIO}>{VEICULO_PROPRIO}</SelectItem>
                {veiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.placa} — {v.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            // Sem exigir motorista nem veículo: deixar os dois para depois é
            // uma escolha válida. Só "nada mudou" bloqueia.
            disabled={saving || semMudanca}
            onClick={() =>
              onSave({
                motoristaId: motoristaParaPayload(motoristaId),
                ...veiculoParaPayload(veiculoId),
              })
            }
          >
            {saving ? 'Salvando...' : 'Salvar atribuição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
