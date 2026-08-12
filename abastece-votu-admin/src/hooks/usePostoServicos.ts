import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database.types';

export type PostoServicos = Database['public']['Tables']['posto_servicos']['Row'];

const DEFAULT_SERVICOS: Omit<PostoServicos, 'posto_id' | 'updated_at'> = {
  conveniencia: false,
  gas_cozinha: false,
  troca_oleo: false,
  carregador_ev: false,
  aceita_ticket: false,
};

export function usePostoServicos(postoId: string) {
  return useQuery({
    queryKey: ['posto_servicos', postoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posto_servicos')
        .select('*')
        .eq('posto_id', postoId)
        .maybeSingle();

      if (error) throw error;

      return data ?? {
        posto_id: postoId,
        updated_at: new Date().toISOString(),
        ...DEFAULT_SERVICOS,
      };
    },
    enabled: !!postoId,
  });
}

export function useSavePostoServicos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (servicos: PostoServicos) => {
      const { error } = await supabase
        .from('posto_servicos')
        .upsert(servicos, { onConflict: 'posto_id' });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posto_servicos', variables.posto_id] });
    },
  });
}
