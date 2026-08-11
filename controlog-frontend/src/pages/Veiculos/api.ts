import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { StatusVeiculo, Veiculo, VeiculoInput } from './types';

interface ListParams {
  busca?: string;
  status?: StatusVeiculo;
}

export function useVeiculos(params: ListParams = {}) {
  return useQuery({
    queryKey: ['veiculos', params],
    queryFn: async () => (await api.get<Veiculo[]>('/veiculos', { params })).data,
  });
}

export function useCreateVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: VeiculoInput) => (await api.post<Veiculo>('/veiculos', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['veiculos'] }),
  });
}

export function useUpdateVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VeiculoInput> }) =>
      (await api.put<Veiculo>(`/veiculos/${id}`, data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['veiculos'] }),
  });
}

export function useDeleteVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/veiculos/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['veiculos'] }),
  });
}
