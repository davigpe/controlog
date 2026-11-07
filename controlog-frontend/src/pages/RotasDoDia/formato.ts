import type { BaseDoDia, RotaDoDia } from './types'

/**
 * Fuso de operação, fixado aqui pelo mesmo motivo do backend: o recorte do
 * dia é feito no servidor em UTC-3, e se a tela formatasse os horários no
 * fuso do navegador, um usuário fora do Brasil veria horas que não batem com
 * o dia que ele pediu.
 */
const FUSO_OPERACAO = 'America/Sao_Paulo'

/** "08:30" — o horário da rota no fuso de operação. */
export function horaDaRota(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO_OPERACAO,
  })
}

/** "07/11/2026" a partir de um AAAA-MM-DD, sem passar por fuso nenhum. */
export function dataPorExtenso(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

/** Hoje em AAAA-MM-DD, como o <input type="date"> espera. */
export function hojeISO(): string {
  const agora = new Date()
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

export const LABEL_BASE: Record<BaseDoDia, string> = {
  dataHora: 'Horário da rota',
  criadoEm: 'Cadastro no sistema',
}

export const AJUDA_BASE: Record<BaseDoDia, string> = {
  dataHora: 'Conta as rotas cujo carregamento está marcado para este dia.',
  criadoEm: 'Conta as rotas que foram cadastradas no sistema neste dia.',
}

export const LABEL_STATUS: Record<RotaDoDia['status'], string> = {
  ATIVA: 'Ativa',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

/** O horário que importa na visão escolhida — é a coluna "Horário" da tabela. */
export function horarioDaBase(rota: RotaDoDia, base: BaseDoDia): string {
  return horaDaRota(base === 'criadoEm' ? rota.criadoEm : rota.dataHora)
}
