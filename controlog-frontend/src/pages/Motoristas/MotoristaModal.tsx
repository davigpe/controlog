import { X, Phone, Mail, Truck, CreditCard, Calendar, Package, FileText } from 'lucide-react'
import type { Motorista } from './types'

interface Props {
  motorista: Motorista | null
  onClose: () => void
}

const statusStyle: Record<string, string> = {
  'Ativo':    'bg-green-100 text-green-700',
  'Em Rota':  'bg-yellow-100 text-yellow-700',
  'Inativo':  'bg-gray-100 text-gray-500',
}

export default function MotoristaModal({ motorista, onClose }: Props) {
  if (!motorista) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header com avatar */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {motorista.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{motorista.nome}</h2>
              <p className="text-blue-100 text-sm">{motorista.id}</p>
              <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[motorista.status]}`}>
                {motorista.status}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{motorista.entregasRealizadas}</p>
              <p className="text-xs text-gray-500 mt-0.5">Entregas</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-green-600">{motorista.categoriaCnh}</p>
              <p className="text-xs text-gray-500 mt-0.5">Cat. CNH</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-sm font-bold text-purple-600 leading-tight">{motorista.dataAdmissao}</p>
              <p className="text-xs text-gray-500 mt-0.5">Admissão</p>
            </div>
          </div>

          {/* Dados */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={<Phone size={15} />}    label="Telefone"  value={motorista.telefone}  />
            <InfoRow icon={<Mail size={15} />}     label="E-mail"    value={motorista.email}     />
            <InfoRow icon={<CreditCard size={15} />} label="CNH"     value={motorista.cnh}       />
            <InfoRow icon={<Truck size={15} />}    label="Veículo"   value={motorista.veiculo}   />
          </div>

          {motorista.observacoes && (
            <div className="flex items-start gap-2 text-sm bg-gray-50 rounded-lg p-3">
              <FileText size={15} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Observações</p>
                <p className="text-gray-600">{motorista.observacoes}</p>
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
