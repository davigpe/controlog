import { X, MapPin, User, Truck, Calendar, Package, FileText } from 'lucide-react'
import type { Entrega } from './types'

interface Props {
  entrega: Entrega | null
  onClose: () => void
}

const statusStyle: Record<string, string> = {
  'Concluída': 'bg-green-100 text-green-700',
  'Em Rota':   'bg-yellow-100 text-yellow-700',
  'Pendente':  'bg-red-100 text-red-700',
  'Cancelada': 'bg-gray-100 text-gray-500',
}

export default function EntregaModal({ entrega, onClose }: Props) {
  if (!entrega) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Detalhes da Entrega</p>
            <h2 className="text-lg font-bold text-gray-800">{entrega.id}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[entrega.status]}`}>
              {entrega.status}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={<User size={15} />}     label="Cliente"       value={entrega.cliente}     />
            <InfoRow icon={<Truck size={15} />}    label="Veículo"       value={entrega.veiculo}     />
            <InfoRow icon={<User size={15} />}     label="Motorista"     value={entrega.motorista}   />
            <InfoRow icon={<Package size={15} />}  label="Peso"          value={entrega.peso}        />
            <InfoRow icon={<Calendar size={15} />} label="Prev. Entrega" value={entrega.dataPrevista} />
            {entrega.dataConclusao && (
              <InfoRow icon={<Calendar size={15} />} label="Concluída em" value={entrega.dataConclusao} />
            )}
          </div>

          <div className="pt-1">
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={15} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Endereço de Entrega</p>
                <p className="text-gray-700">{entrega.endereco}</p>
              </div>
            </div>
          </div>

          {entrega.observacoes && (
            <div className="flex items-start gap-2 text-sm bg-gray-50 rounded-lg p-3">
              <FileText size={15} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Observações</p>
                <p className="text-gray-600">{entrega.observacoes}</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-blue-500 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className="text-gray-700">{value}</p>
      </div>
    </div>
  )
}
