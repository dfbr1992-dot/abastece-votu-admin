import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

const fetchPWAInstallationsCount = async () => {
  // @ts-ignore - ignorando erro de tipo caso a tabela ainda não tenha sido criada no Supabase
  const { count, error } = await supabase
    .from('app_installations')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(error.message);
  }
  return count;
};

export function usePWAInstallationsCount() {
  return useQuery({
    queryKey: ['pwaInstallationsCount'],
    queryFn: fetchPWAInstallationsCount,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
}
