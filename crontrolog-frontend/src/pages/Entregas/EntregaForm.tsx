import { useState } from 'react'
import { X, Save } from 'lucide-react'
import type { Entrega, StatusEntrega } from './types'

interface Props {
  onClose: () => void
  onSave: (entrega: Entrega) => void
}

const initialForm = {
  cliente: '',
  destino: '',
  endereco: '',
  motorista: '',
  veiculo: '',
  status: 'Pendente' as StatusEntrega,
  dataPrevista: '',
  peso: '',
  observacoes: '',
}

const motoristas = [
  'João Silva',
  'Carlos Melo',
  'Pedro Lima',
  'Ana Costa',
  'Lucas Dias',
]

const veiculos = [
  'Ford Cargo - ABC-1234',
  'VW Delivery - DEF-5678',
  'Mercedes Axor - GHI-9012',
  'Ford Cargo - JKL-3456',
  'VW Constellation - MNO-7890',
]

export default function EntregaForm({ onClose, onSave }: Props) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<Partial<typeof initialForm>>({})

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const newErrors: Partial<typeof initialForm> = {}
    if (!form.cliente.trim())      newErrors.cliente      = 'Campo obrigatório'
    if (!form.destino.trim())      newErrors.destino      = 'Campo obrigatório'
    if (!form.endereco.trim())     newErrors.endereco     = 'Campo obrigatório'
    if (!form.dataPrevista.trim()) newErrors.dataPrevista = 'Campo obrigatório'
    if (!form.peso.trim())         newErrors.peso         = 'Campo obrigatório'
    return newErrors
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const novaEntrega: Entrega = {
      ...form,
      id: `#${String(Math.floor(Math.random() * 900) + 100)}`,
      motorista: form.motorista || '-',
      veiculo:   form.veiculo   || '-',
    }

    onSave(novaEntrega)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Nova Entrega</p>
            <h2 className="text-lg font-bold text-gray-800">Cadastrar Entrega</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* Cliente + Destino */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cliente *" error={errors.cliente}>
                <input
                  name="cliente"
                  value={form.cliente}
                  onChange={handleChange}
                  placeholder="Nome do cliente"
                  className={inputClass(!!errors.cliente)}
                />
              </Field>

              <Field label="Destino *" error={errors.destino}>
                <input
                  name="destino"
                  value={form.destino}
                  onChange={handleChange}
                  placeholder="Cidade, UF"
                  className={inputClass(!!errors.destino)}
                />
              </Field>
            </div>

            {/* Endereço completo */}
            <Field label="Endereço de Entrega *" error={errors.endereco}>
              <input
                name="endereco"
                value={form.endereco}
                onChange={handleChange}
                placeholder="Rua, número, bairro, cidade - UF"
                className={inputClass(!!errors.endereco)}
              />
            </Field>

            {/* Motorista + Veículo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Motorista">
                <select
                  name="motorista"
                  value={form.motorista}
                  onChange={handleChange}
                  className={inputClass(false)}
                >
                  <option value="">Selecione o motorista</option>
                  {motoristas.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>

              <Field label="Veículo">
                <select
                  name="veiculo"
                  value={form.veiculo}
                  onChange={handleChange}
                  className={inputClass(false)}
                >
                  <option value="">Selecione o veículo</option>
                  {veiculos.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Data + Peso + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Data Prevista *" error={errors.dataPrevista}>
                <input
                  type="date"
                  name="dataPrevista"
                  value={form.dataPrevista}
                  onChange={handleChange}
                  className={inputClass(!!errors.dataPrevista)}
                />
              </Field>

              <Field label="Peso *" error={errors.peso}>
                <input
                  name="peso"
                  value={form.peso}
                  onChange={handleChange}
                  placeholder="Ex: 1.200 kg"
                  className={inputClass(!!errors.peso)}
                />
              </Field>

              <Field label="Status">
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={inputClass(false)}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Rota">Em Rota</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </Field>
            </div>

            {/* Observações */}
            <Field label="Observações">
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={handleChange}
                rows={3}
                placeholder="Informações adicionais sobre a entrega..."
                className={`${inputClass(false)} resize-none`}
              />
            </Field>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Save size={15} />
              Salvar Entrega
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function inputClass(hasError: boolean) {
  return `w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-red-400 focus:ring-red-300'
      : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
  }`
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
