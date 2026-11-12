import { useState } from 'react'
import { AlertTriangle, Calendar, CheckCircle, Clock, MapPin, Package, Truck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import { useConcluirEntrega, useMinhasRotas, useRegistrarInsucesso } from './api'
import ComprovantesEntrega from './ComprovantesEntrega'
import InsucessoModal from './InsucessoModal'
import { MOTIVO_INSUCESSO_LABEL } from './insucesso'
import type { EntregaDaRota, MotivoInsucesso, StatusEntrega, StatusRota } from './types'

const filtros: { label: string; valor: StatusRota | 'Todas' }[] = [
  { label: 'Todas',      valor: 'Todas' },
  { label: 'Ativas',     valor: 'ATIVA' },
  { label: 'Concluídas', valor: 'CONCLUIDA' },
  { label: 'Canceladas', valor: 'CANCELADA' },
]

const rotaStatusStyle: Record<StatusRota, string> = {
  ATIVA:      'bg-blue-100 text-blue-700',
  CONCLUIDA:  'bg-green-100 text-green-700',
  CANCELADA:  'bg-gray-100 text-gray-700',
}

const rotaStatusLabel: Record<StatusRota, string> = {
  ATIVA: 'Ativa',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

const entregaStatusStyle: Record<StatusEntrega, string> = {
  PENDENTE:    'bg-yellow-100 text-yellow-700',
  EM_TRANSITO: 'bg-blue-100 text-blue-700',
  ENTREGUE:    'bg-green-100 text-green-700',
  NAO_ENTREGUE:'bg-amber-100 text-amber-800',
  CANCELADA:   'bg-red-100 text-red-700',
}

const entregaStatusLabel: Record<StatusEntrega, string> = {
  PENDENTE: 'Pendente',
  EM_TRANSITO: 'Em trânsito',
  ENTREGUE: 'Entregue',
  NAO_ENTREGUE: 'Não entregue',
  CANCELADA: 'Cancelada',
}

const entregaStatusIcon: Record<StatusEntrega, React.ReactNode> = {
  PENDENTE:    <Clock size={13} />,
  EM_TRANSITO: <Truck size={13} />,
  ENTREGUE:    <CheckCircle size={13} />,
  NAO_ENTREGUE:<AlertTriangle size={13} />,
  CANCELADA:   <XCircle size={13} />,
}

export default function MinhasRotas() {
  const [filtro, setFiltro] = useState<StatusRota | 'Todas'>('Todas')
  const { data, isLoading, isError } = useMinhasRotas(filtro === 'Todas' ? undefined : filtro)
  const concluirMutation = useConcluirEntrega()
  const insucessoMutation = useRegistrarInsucesso()
  const [entregaInsucesso, setEntregaInsucesso] = useState<EntregaDaRota | null>(null)

  const rotas = data?.rotas ?? []
  const totalEntregas = rotas.reduce((soma, rota) => soma + rota.entregas.length, 0)
  const pendentes = rotas.reduce(
    (soma, rota) => soma + rota.entregas.filter((e) => e.status === 'PENDENTE' || e.status === 'EM_TRANSITO').length,
    0
  )

  function handleInsucesso(dados: { motivo: MotivoInsucesso; observacao?: string }) {
    if (!entregaInsucesso) return
    const { id, codigo } = entregaInsucesso
    insucessoMutation
      .mutateAsync({ entregaId: id, ...dados })
      .then(() => {
        toast.success(`Insucesso registrado na entrega ${codigo}.`)
        setEntregaInsucesso(null)
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Não foi possível registrar o insucesso.')))
  }

  function handleConcluir(entregaId: string, codigo: string) {
    concluirMutation
      .mutateAsync(entregaId)
      .then(() => toast.success(`Entrega ${codigo} concluída.`))
      .catch((error) => toast.error(getErrorMessage(error, 'Não foi possível concluir esta entrega.')))
  }

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Minhas Rotas</h1>
        <p className="text-sm text-gray-600">
          {data
            ? `${data.motorista.nome} — ${rotas.length} rota(s), ${totalEntregas} entrega(s), ${pendentes} pendente(s)`
            : 'Carregando suas rotas...'}
        </p>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-2 flex-wrap">
        {filtros.map(({ label, valor }) => (
          <button
            key={valor}
            onClick={() => setFiltro(valor)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              filtro === valor
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Rotas ── */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Carregando suas rotas...
        </div>
      ) : isError ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Não foi possível carregar suas rotas. Tente novamente em alguns instantes.
        </div>
      ) : rotas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Nenhuma rota atribuída a você para este filtro.
        </div>
      ) : (
        <div className="space-y-4">
          {rotas.map((rota) => (
            <section key={rota.id} className="bg-white rounded-xl shadow-sm overflow-hidden">

              <header className="p-5 border-b border-gray-100 flex flex-wrap items-start gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-800">{rota.codigo}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${rotaStatusStyle[rota.status]}`}>
                      {rotaStatusLabel[rota.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                    <MapPin size={14} className="text-blue-500 shrink-0" />
                    <span className="truncate">{rota.origem} → {rota.destino}</span>
                  </p>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-500" />
                    {new Date(rota.dataHora).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Truck size={14} className="text-blue-500" />
                    {rota.veiculo.placa} — {rota.veiculo.modelo}
                  </span>
                </div>
              </header>

              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-3 flex items-center gap-1.5">
                  <Package size={14} className="text-blue-500" />
                  {rota.entregas.length} entrega(s)
                </h3>

                {rota.entregas.length === 0 ? (
                  <p className="text-sm text-gray-600">Esta rota ainda não tem entregas vinculadas.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {rota.entregas.map((entrega) => {
                      // NAO_ENTREGUE continua aceitando conclusão: o motorista
                      // pode voltar ao endereço e entregar na segunda tentativa.
                      const podeConcluir =
                        entrega.status === 'PENDENTE' ||
                        entrega.status === 'EM_TRANSITO' ||
                        entrega.status === 'NAO_ENTREGUE'
                      const podeRegistrarInsucesso =
                        entrega.status === 'PENDENTE' || entrega.status === 'EM_TRANSITO'
                      const semComprovante = (entrega.comprovantes ?? []).length === 0

                      return (
                      <li key={entrega.id} className="py-3 text-sm">
                        {/* Uma coluna no celular, linha no desktop: no telefone
                            o destino é a informação que o motorista precisa ler
                            inteira, e espremê-lo numa linha com mais quatro
                            elementos o reduzia a reticências. */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="font-medium text-gray-700 shrink-0">{entrega.codigo}</span>
                          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${entregaStatusStyle[entrega.status]}`}>
                            {entregaStatusIcon[entrega.status]}
                            {entregaStatusLabel[entrega.status]}
                          </span>
                          <span className="text-xs text-gray-600 sm:ml-auto shrink-0">
                            {entrega.dataEfetiva
                              ? `${entrega.status === 'NAO_ENTREGUE' ? 'Tentativa em' : 'Entregue em'} ${new Date(entrega.dataEfetiva).toLocaleDateString('pt-BR')}`
                              : new Date(entrega.dataPrevista).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        <p className="text-gray-600 mt-1 flex items-start gap-1.5">
                          <MapPin size={14} className="text-blue-500 shrink-0 mt-0.5" />
                          <span className="min-w-0">{entrega.destino}</span>
                        </p>

                        {entrega.motivoInsucesso && (
                          <p className="text-xs text-amber-800 mt-1.5">
                            {MOTIVO_INSUCESSO_LABEL[entrega.motivoInsucesso]}
                            {entrega.observacao ? ` — ${entrega.observacao}` : ''}
                          </p>
                        )}

                        {(podeConcluir || (entrega.comprovantes ?? []).length > 0) && (
                          <div className="mt-2.5">
                            <ComprovantesEntrega entrega={entrega} podeEditar={podeConcluir} />
                          </div>
                        )}

                        {(podeConcluir || podeRegistrarInsucesso) && (
                          <div className="mt-2.5 flex flex-col sm:flex-row gap-2">
                            {podeConcluir && (
                              <button
                                onClick={() => handleConcluir(entrega.id, entrega.codigo)}
                                disabled={concluirMutation.isPending || semComprovante}
                                aria-label={`Marcar entrega ${entrega.codigo} como concluída`}
                                // O title explica o bloqueio: um botão apagado
                                // sem motivo visível parece defeito do app.
                                title={semComprovante ? 'Anexe ao menos um comprovante para concluir' : undefined}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <CheckCircle size={13} />
                                Concluir
                              </button>
                            )}
                            {podeRegistrarInsucesso && (
                              <button
                                onClick={() => setEntregaInsucesso(entrega)}
                                aria-label={`Registrar insucesso na entrega ${entrega.codigo}`}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium border border-amber-600 text-amber-700 hover:bg-amber-50 transition-colors"
                              >
                                <AlertTriangle size={13} />
                                Não entregue
                              </button>
                            )}
                          </div>
                        )}

                        {podeConcluir && semComprovante && (
                          <p className="mt-1.5 text-xs text-gray-500">
                            Anexe a foto do comprovante para liberar a conclusão.
                          </p>
                        )}
                      </li>
                      )
                    })}
                  </ul>
                )}
              </div>

            </section>
          ))}
        </div>
      )}

      <InsucessoModal
        entrega={entregaInsucesso}
        onClose={() => setEntregaInsucesso(null)}
        onSave={handleInsucesso}
        saving={insucessoMutation.isPending}
      />
    </div>
  )
}
