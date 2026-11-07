import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EntregaDaRota, MinhasRotasResposta, MotivoInsucesso, StatusRota } from './types';

export function useMinhasRotas(status?: StatusRota) {
  return useQuery({
    queryKey: ['minhas-rotas', status ?? 'todas'],
    queryFn: async () =>
      (await api.get<MinhasRotasResposta>('/minhas-rotas', { params: { status } })).data,
  });
}

export function useConcluirEntrega() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entregaId: string) =>
      (await api.patch<EntregaDaRota>(`/minhas-rotas/entregas/${entregaId}/concluir`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['minhas-rotas'] }),
  });
}

export interface InsucessoInput {
  entregaId: string;
  motivo: MotivoInsucesso;
  observacao?: string;
}

export function useRegistrarInsucesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ entregaId, ...corpo }: InsucessoInput) =>
      (await api.patch<EntregaDaRota>(`/minhas-rotas/entregas/${entregaId}/insucesso`, corpo)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['minhas-rotas'] }),
  });
}
