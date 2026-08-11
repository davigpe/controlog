import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RelatorioResponse {
  periodo: { dataInicio: string | null; dataFim: string | null };
  rotasPorStatus: Record<string, number>;
  entregasPorStatus: Record<string, number>;
  totalEntregas: number;
  motoristasMaisAtivos: { motorista: string; entregas: number }[];
}

interface Params {
  dataInicio?: string;
  dataFim?: string;
}

export function useRelatorio(params: Params) {
  return useQuery({
    queryKey: ['relatorios', params],
    queryFn: async () => (await api.get<RelatorioResponse>('/relatorios', { params })).data,
  });
}
