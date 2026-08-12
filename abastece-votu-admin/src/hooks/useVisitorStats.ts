import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export type VisitorStatsDia = {
  dia: string;
  novos_usuarios: number;
  usuarios_ativos: number;
  novas_instalacoes: number;
};

/**
 * Hook de métricas de visitantes.
 * O queryKey usa apenas o número de dias (7|14|30), não objetos Date
 * recriados a cada render, evitando refetch em loop.
 */
export function useVisitorStats(dias: number) {
  const dataInicio = subDays(new Date(), dias);
  return useQuery({
    queryKey: ['visitor_stats', dias],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_visitor_stats_series', {
        data_inicio: dataInicio.toISOString(),
        data_fim: new Date().toISOString(),
      });
      if (error) throw error;
      return data as VisitorStatsDia[];
    },
    staleTime: 60_000, // dados considerados frescos por 1 minuto
    gcTime: 5 * 60_000, // mantém em cache por 5 min
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
  });
}
