import { useState } from 'react'
import { X, Save } from 'lucide-react'
import type { Veiculo, StatusVeiculo } from './types'

interface Props {
  onClose: () => void
  onSave:  (veiculo: Veiculo) => void
}

const initialForm = {
  placa:          '',
  modelo:         '',
  marca:          '',
  ano:            '',
  tipo:           '',
  capacidade:     '',
  status:         'Disponível' as StatusVeiculo,
  motorista:      '',
  kmAtual:        '',
  ultimaRevisao:  '',
  proximaRevisao: '',
  observacoes:    '',
}

const marcas   = ['Ford', 'Volkswagen', 'Mercedes-Benz', 'Iveco', 'Scania', 'Volvo', 'DAF']
const tipos    = ['Caminhão', 'Van', 'Utilitário', 'Carreta']
const motoristas = ['João Silva', 'Carlos Melo', 'Pedro Lima', 'Ana Costa', 'Lucas Dias']

export default function VeiculoForm({ onClose, onSave }: Props) {
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
    if (!form.placa.trim())          e.placa          = 'Campo obrigatório'
    if (!form.modelo.trim())         e.modelo         = 'Campo obrigatório'
    if (!form.marca.trim())          e.marca          = 'Campo obrigatório'
    if (!form.ano.trim())            e.ano            = 'Campo obrigatório'
    if (!form.tipo.trim())           e.tipo           = 'Campo obrigatório'
    if (!form.capacidade.trim())     e.capacidade     = 'Campo obrigatório'
    if (!form.kmAtual.trim())        e.kmAtual        = 'Campo obrigatório'
    if (!form.ultimaRevisao.trim())  e.ultimaRevisao  = 'Campo obrigatório'
    if (!form.proximaRevisao.trim()) e.proximaRevisao = 'Campo obrigatório'
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const novo: Veiculo = {
      ...form,
      id:        `V${String(Math.floor(Math.random() * 900) + 100)}`,
      motorista: form.motorista || 'Não atribuído',
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
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Novo Veículo</p>
            <h2 className="text-lg font-bold text-gray-800">Cadastrar Veículo</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {/* Placa + Modelo + Marca */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Placa *" error={errors.placa}>
                <input
                  name="placa"
                  value={form.placa}
                  onChange={handleChange}
                  placeholder="ABC-1234"
                  className={inputClass(!!errors.placa)}
                />
              </Field>

              <Field label="Marca *" error={errors.marca}>
                <select
                  name="marca"
                  value={form.marca}
                  onChange={handleChange}
                  className={inputClass(!!errors.marca)}
                >
                  <option value="">Selecione</option>
                  {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>

              <Field label="Modelo *" error={errors.modelo}>
                <input
                  name="modelo"
                  value={form.modelo}
                  onChange={handleChange}
                  placeholder="Ex: Cargo 1723"
                  className={inputClass(!!errors.modelo)}
                />
              </Field>
            </div>

            {/* Tipo + Ano + Capacidade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Tipo *" error={errors.tipo}>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                  className={inputClass(!!errors.tipo)}
                >
                  <option value="">Selecione</option>
                  {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="Ano *" error={errors.ano}>
                <input
                  name="ano"
                  value={form.ano}
                  onChange={handleChange}
                  placeholder="Ex: 2022"
                  className={inputClass(!!errors.ano)}
                />
              </Field>

              <Field label="Capacidade *" error={errors.capacidade}>
                <input
                  name="capacidade"
                  value={form.capacidade}
                  onChange={handleChange}
                  placeholder="Ex: 5.000 kg"
                  className={inputClass(!!errors.capacidade)}
                />
              </Field>
            </div>

            {/* KM Atual + Status + Motorista */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="KM Atual *" error={errors.kmAtual}>
                <input
                  name="kmAtual"
                  value={form.kmAtual}
                  onChange={handleChange}
                  placeholder="Ex: 45.320 km"
                  className={inputClass(!!errors.kmAtual)}
                />
              </Field>

              <Field label="Status">
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={inputClass(false)}
                >
                  <option value="Disponível">Disponível</option>
                  <option value="Em Rota">Em Rota</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </Field>

              <Field label="Motorista Atribuído">
                <select
                  name="motorista"
                  value={form.motorista}
                  onChange={handleChange}
                  className={inputClass(false)}
                >
                  <option value="">Nenhum</option>
                  {motoristas.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>

            {/* Última revisão + Próxima revisão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Última Revisão *" error={errors.ultimaRevisao}>
                <input
                  type="date"
                  name="ultimaRevisao"
                  value={form.ultimaRevisao}
                  onChange={handleChange}
                  className={inputClass(!!errors.ultimaRevisao)}
                />
              </Field>

              <Field label="Próxima Revisão *" error={errors.proximaRevisao}>
                <input
                  type="date"
                  name="proximaRevisao"
                  value={form.proximaRevisao}
                  onChange={handleChange}
                  className={inputClass(!!errors.proximaRevisao)}
                />
              </Field>
            </div>

            {/* Observações */}
            <Field label="Observações">
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={handleChange}
                rows={3}
                placeholder="Informações adicionais sobre o veículo..."
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
              Salvar Veículo
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
