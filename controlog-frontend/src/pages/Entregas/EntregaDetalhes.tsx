import { MapPin, User, Calendar, Route } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Entrega } from './types'

interface Props {
  entrega: Entrega | null
  onClose: () => void
}

const statusStyle: Record<string, string> = {
  ENTREGUE: 'bg-green-100 text-green-700',
  EM_TRANSITO: 'bg-yellow-100 text-yellow-700',
  PENDENTE: 'bg-red-100 text-red-700',
  CANCELADA: 'bg-gray-100 text-gray-700',
}

const statusLabel: Record<string, string> = {
  ENTREGUE: 'Entregue',
  EM_TRANSITO: 'Em Trânsito',
  PENDENTE: 'Pendente',
  CANCELADA: 'Cancelada',
}

export default function EntregaDetalhes({ entrega, onClose }: Props) {
  if (!entrega) return null

  return (
    <Dialog open={!!entrega} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Entrega {entrega.codigo}</DialogTitle>
          <DialogDescription className="sr-only">Detalhes da entrega {entrega.codigo}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusStyle[entrega.status]}`}>
            {statusLabel[entrega.status]}
          </span>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={<Route size={15} />}    label="Rota"          value={entrega.rota.codigo} />
            <InfoRow icon={<User size={15} />}     label="Motorista"     value={entrega.motorista.nome} />
            <InfoRow icon={<Calendar size={15} />} label="Prev. Entrega" value={new Date(entrega.dataPrevista).toLocaleDateString('pt-BR')} />
            {entrega.dataEfetiva && (
              <InfoRow icon={<Calendar size={15} />} label="Concluída em" value={new Date(entrega.dataEfetiva).toLocaleDateString('pt-BR')} />
            )}
          </div>

          <div className="flex items-start gap-2 text-sm">
            <MapPin size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-600 font-medium mb-0.5">Destino</p>
              <p className="text-gray-700">{entrega.destino}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-blue-500 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-600 font-medium mb-0.5">{label}</p>
        <p className="text-gray-700">{value}</p>
      </div>
    </div>
  )
}
