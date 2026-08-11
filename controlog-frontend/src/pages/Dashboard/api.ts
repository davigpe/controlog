import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DashboardResumo {
  rotas: {
    ativas: number;
    concluidas: number;
    canceladas: number;
    total: number;
  };
  totalMotoristas: number;
  totalVeiculos: number;
  totalEntregas: number;
  entregasPorStatus: Record<string, number>;
}

export function useDashboardResumo() {
  return useQuery({
    queryKey: ['dashboard', 'resumo'],
    queryFn: async () => (await api.get<DashboardResumo>('/dashboard/resumo')).data,
  });
}
