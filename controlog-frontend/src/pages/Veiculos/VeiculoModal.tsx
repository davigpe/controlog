import { X, User, Gauge, Calendar, Package, Wrench, FileText } from 'lucide-react'
import type { Veiculo } from './types'

interface Props {
  veiculo: Veiculo | null
  onClose: () => void
}

const statusStyle: Record<string, string> = {
  'Disponível':  'bg-green-100 text-green-700',
  'Em Rota':     'bg-yellow-100 text-yellow-700',
  'Manutenção':  'bg-orange-100 text-orange-700',
  'Inativo':     'bg-gray-100 text-gray-500',
}

const tipoIcon: Record<string, string> = {
  'Caminhão':    '🚛',
  'Van':         '🚐',
  'Utilitário':  '🚚',
  'Carreta':     '🚜',
}

export default function VeiculoModal({ veiculo, onClose }: Props) {
  if (!veiculo) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-3xl shrink-0">
              {tipoIcon[veiculo.tipo] ?? '🚚'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{veiculo.marca} {veiculo.modelo}</h2>
              <p className="text-blue-100 text-sm font-mono tracking-widest">{veiculo.placa}</p>
              <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[veiculo.status]}`}>
                {veiculo.status}
              </span>
            </div>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-sm font-bold text-blue-600">{veiculo.ano}</p>
            <p className="text-xs text-gray-500 mt-0.5">Ano</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-sm font-bold text-purple-600">{veiculo.kmAtual}</p>
            <p className="text-xs text-gray-500 mt-0.5">KM Atual</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-sm font-bold text-green-600">{veiculo.capacidade}</p>
            <p className="text-xs text-gray-500 mt-0.5">Capacidade</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={<Package size={15} />}  label="Tipo"            value={veiculo.tipo}           />
            <InfoRow icon={<User size={15} />}     label="Motorista"       value={veiculo.motorista}      />
            <InfoRow icon={<Wrench size={15} />}   label="Última Revisão"  value={veiculo.ultimaRevisao}  />
            <InfoRow icon={<Calendar size={15} />} label="Próxima Revisão" value={veiculo.proximaRevisao} />
          </div>

          {veiculo.observacoes && (
            <div className="flex items-start gap-2 text-sm bg-gray-50 rounded-lg p-3">
              <FileText size={15} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Observações</p>
                <p className="text-gray-600">{veiculo.observacoes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
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
