import { Package } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Veiculo } from './types'
import { statusExibicao } from './status'

const statusStyle: Record<string, string> = {
  'Disponível': 'bg-green-100 text-green-700',
  'Em Rota':    'bg-yellow-100 text-yellow-700',
  'Manutenção': 'bg-orange-100 text-orange-700',
  'Inativo':    'bg-gray-100 text-gray-700',
}

interface Props {
  veiculo: Veiculo | null
  onClose: () => void
}

export default function VeiculoDetalhes({ veiculo, onClose }: Props) {
  if (!veiculo) return null
  const status = statusExibicao(veiculo)

  return (
    <Dialog open={!!veiculo} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{veiculo.modelo}</DialogTitle>
          <DialogDescription className="sr-only">Detalhes do veículo placa {veiculo.placa}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[status]}`}>
            {status}
          </span>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-600 font-medium mb-0.5">Placa</p>
              <p className="font-mono text-gray-700">{veiculo.placa}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium mb-0.5 flex items-center gap-1">
                <Package size={13} /> Capacidade
              </p>
              <p className="text-gray-700">{veiculo.capacidade}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
