import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlanoDetalhe } from './types';

interface AprovarRotaInput {
  rotaIndex: number;
  motoristaId: string;
  veiculoId: string;
  dataHora: string;
}

interface RotaAprovada {
  id: string;
  codigo: string;
}

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

export function useAprovarRota(planoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rotaIndex, motoristaId, veiculoId, dataHora }: AprovarRotaInput) =>
      (
        await api.post<RotaAprovada>(`/planos/${planoId}/rotas/${rotaIndex}/aprovar`, {
          motoristaId,
          veiculoId,
          dataHora,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      queryClient.invalidateQueries({ queryKey: ['rotas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
