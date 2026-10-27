import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MOTIVO_INSUCESSO_LABEL, MOTIVOS_INSUCESSO } from './insucesso'
import type { EntregaDaRota, MotivoInsucesso } from './types'

interface Props {
  entrega: EntregaDaRota | null
  onClose: () => void
  onSave: (data: { motivo: MotivoInsucesso; observacao?: string }) => void
  saving?: boolean
}

export default function InsucessoModal({ entrega, onClose, onSave, saving }: Props) {
  const [entregaId, setEntregaId] = useState(entrega?.id)
  const [motivo, setMotivo] = useState<MotivoInsucesso | ''>('')
  const [observacao, setObservacao] = useState('')

  // Abrir para outra entrega recomeça do zero — ajuste em render, como nos
  // outros modais do projeto, para não renderizar uma vez com o valor antigo.
  if (entrega?.id !== entregaId) {
    setEntregaId(entrega?.id)
    setMotivo('')
    setObservacao('')
  }

  // "Outro" sem descrição não diz nada a quem for tratar a entrega depois, e é
  // a mesma regra que o backend aplica — aqui só evita a ida até o servidor.
  const faltaDescrever = motivo === 'OUTRO' && observacao.trim() === ''
  const podeSalvar = motivo !== '' && !faltaDescrever

  return (
    <Dialog open={!!entrega} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar insucesso — {entrega?.codigo}</DialogTitle>
          <DialogDescription>
            A entrega fica como não entregue e volta para o gestor decidir o que fazer. Você ainda
            pode concluí-la se conseguir entregar numa segunda tentativa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="insucesso-motivo">Motivo</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoInsucesso)}>
              <SelectTrigger id="insucesso-motivo" className="w-full">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_INSUCESSO.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {MOTIVO_INSUCESSO_LABEL[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="insucesso-observacao">
              Observação {motivo === 'OUTRO' ? '' : '(opcional)'}
            </Label>
            <textarea
              id="insucesso-observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="O que aconteceu na entrega"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {faltaDescrever && (
              <p className="text-xs text-red-600">
                Descreva o motivo na observação quando escolher &quot;Outro&quot;.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => motivo && onSave({ motivo, observacao: observacao.trim() || undefined })}
            disabled={!podeSalvar || saving}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {saving ? 'Registrando...' : 'Registrar insucesso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
