import { useState } from 'react'
import { X, Save } from 'lucide-react'
import type { Motorista, StatusMotorista } from './types'

interface Props {
  onClose: () => void
  onSave: (motorista: Motorista) => void
}

const initialForm = {
  nome:               '',
  cnh:                '',
  categoriaCnh:       '',
  telefone:           '',
  email:              '',
  status:             'Ativo' as StatusMotorista,
  veiculo:            '',
  dataAdmissao:       '',
  observacoes:        '',
}

const veiculos = [
  'Ford Cargo - ABC-1234',
  'VW Delivery - DEF-5678',
  'Mercedes Axor - GHI-9012',
  'Ford Cargo - JKL-3456',
  'VW Constellation - MNO-7890',
]

const categoriasCnh = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']

export default function MotoristaForm({ onClose, onSave }: Props) {
  const [form, setForm]     = useState(initialForm)
  const [errors, setErrors] = useState<Partial<typeof initialForm>>({})

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const e: Partial<typeof initialForm> = {}
    if (!form.nome.trim())         e.nome         = 'Campo obrigatório'
    if (!form.cnh.trim())          e.cnh          = 'Campo obrigatório'
    if (!form.categoriaCnh.trim()) e.categoriaCnh = 'Campo obrigatório'
    if (!form.telefone.trim())     e.telefone     = 'Campo obrigatório'
    if (!form.email.trim())        e.email        = 'Campo obrigatório'
    if (!form.dataAdmissao.trim()) e.dataAdmissao = 'Campo obrigatório'
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const novo: Motorista = {
      ...form,
      id:                  `M${String(Math.floor(Math.random() * 900) + 100)}`,
      entregasRealizadas:  0,
      veiculo:             form.veiculo || 'Não atribuído',
    }
    onSave(novo)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Novo Motorista</p>
            <h2 className="text-lg font-bold text-gray-800">Cadastrar Motorista</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {/* Nome */}
            <Field label="Nome completo *" error={errors.nome}>
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Nome do motorista"
                className={inputClass(!!errors.nome)}
              />
            </Field>

            {/* CNH + Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Número da CNH *" error={errors.cnh}>
                <input
                  name="cnh"
                  value={form.cnh}
                  onChange={handleChange}
                  placeholder="00000000000"
                  className={inputClass(!!errors.cnh)}
                />
              </Field>

              <Field label="Categoria CNH *" error={errors.categoriaCnh}>
                <select
                  name="categoriaCnh"
                  value={form.categoriaCnh}
                  onChange={handleChange}
                  className={inputClass(!!errors.categoriaCnh)}
                >
                  <option value="">Selecione</option>
                  {categoriasCnh.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Telefone + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Telefone *" error={errors.telefone}>
                <input
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  placeholder="(47) 99999-9999"
                  className={inputClass(!!errors.telefone)}
                />
              </Field>

              <Field label="E-mail *" error={errors.email}>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@exemplo.com"
                  className={inputClass(!!errors.email)}
                />
              </Field>
            </div>

            {/* Veículo + Data admissão + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Veículo Atribuído">
                <select
                  name="veiculo"
                  value={form.veiculo}
                  onChange={handleChange}
                  className={inputClass(false)}
                >
                  <option value="">Nenhum</option>
                  {veiculos.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>

              <Field label="Data de Admissão *" error={errors.dataAdmissao}>
                <input
                  type="date"
                  name="dataAdmissao"
                  value={form.dataAdmissao}
                  onChange={handleChange}
                  className={inputClass(!!errors.dataAdmissao)}
                />
              </Field>

              <Field label="Status">
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={inputClass(false)}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Em Rota">Em Rota</option>
                  <option value="Inativo">Inativo</option>
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
                placeholder="Informações adicionais sobre o motorista..."
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
              Salvar Motorista
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-red-400 focus:ring-red-300'
      : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
  }`
}

function Field({
  label, error, children,
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
