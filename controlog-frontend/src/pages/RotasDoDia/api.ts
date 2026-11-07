import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { BaseDoDia, RotasDoDiaResponse } from './types'

interface Params {
  data: string
  base: BaseDoDia
}

export function useRotasDoDia(params: Params) {
  return useQuery({
    queryKey: ['rotas-do-dia', params],
    queryFn: async () =>
      (await api.get<RotasDoDiaResponse>('/relatorios/rotas-do-dia', { params })).data,
  })
}
