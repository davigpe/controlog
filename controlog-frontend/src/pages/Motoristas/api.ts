import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PaginatedResponse } from '@/lib/api';
import type { AcessoMotoristaInput, Motorista, MotoristaInput, StatusMotorista } from './types';

interface ListParams {
  busca?: string;
  status?: StatusMotorista;
  emRota?: boolean;
  page?: number;
  pageSize?: number;
}

export function useMotoristas(params: ListParams = {}) {
  return useQuery({
    queryKey: ['motoristas', params],
    queryFn: async () => (await api.get<PaginatedResponse<Motorista>>('/motoristas', { params })).data,
  });
}

export function useCreateMotorista() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: MotoristaInput) => (await api.post<Motorista>('/motoristas', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['motoristas'] }),
  });
}

export function useUpdateMotorista() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MotoristaInput> }) =>
      (await api.put<Motorista>(`/motoristas/${id}`, data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['motoristas'] }),
  });
}

export function useCriarAcessoMotorista() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AcessoMotoristaInput }) =>
      (await api.post<Motorista>(`/motoristas/${id}/acesso`, data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['motoristas'] }),
  });
}

export function useImportarMotoristas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (motoristas: MotoristaInput[]) =>
      (await api.post<{ importados: number }>('/motoristas/importar', { motoristas })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['motoristas'] }),
  });
}

export function useDeleteMotorista() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/motoristas/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['motoristas'] }),
  });
}
