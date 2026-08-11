import { Phone, CreditCard, Package, Truck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Motorista } from './types'
import { statusExibicao } from './status'

const statusStyle: Record<string, string> = {
  'Ativo':   'bg-green-100 text-green-700',
  'Em Rota': 'bg-yellow-100 text-yellow-700',
  'Inativo': 'bg-gray-100 text-gray-700',
}

interface Props {
  motorista: Motorista | null
  onClose: () => void
}

export default function MotoristaDetalhes({ motorista, onClose }: Props) {
  if (!motorista) return null
  const status = statusExibicao(motorista)

  return (
    <Dialog open={!!motorista} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{motorista.nome}</DialogTitle>
          <DialogDescription className="sr-only">Detalhes do motorista {motorista.nome}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[status]}`}>
            {status}
          </span>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={<Phone size={15} />} label="Telefone" value={motorista.telefone} />
            <InfoRow icon={<CreditCard size={15} />} label="CNH" value={motorista.cnh} />
            <InfoRow icon={<Package size={15} />} label="Entregas concluídas" value={String(motorista.entregasRealizadas)} />
            <InfoRow icon={<Truck size={15} />} label="Em rota agora" value={motorista.emRota ? 'Sim' : 'Não'} />
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
