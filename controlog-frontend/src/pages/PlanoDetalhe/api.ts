import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlanoDetalhe } from './types';

export function usePlano(id: string) {
  return useQuery({
    queryKey: ['planos', id],
    queryFn: async () => (await api.get<PlanoDetalhe>(`/planos/${id}`)).data,
    enabled: !!id,
  });
}

export function useOtimizarPlano(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tamanhoRota: number) =>
      (await api.post<PlanoDetalhe>(`/planos/${id}/otimizar`, { tamanhoRota })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planos'] }),
  });
}

export function useRenomearPlano(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => (await api.put<PlanoDetalhe>(`/planos/${id}`, { nome })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planos'] }),
  });
}
