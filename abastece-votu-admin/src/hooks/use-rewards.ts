import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Reward = {
  id: string;
  nome: string;
  descricao: string | null;
  custo_pontos: number;
  emoji: string | null;
};

export function useRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  useEffect(() => {
    supabase
      .from("rewards")
      .select("id,nome,descricao,custo_pontos,emoji")
      .eq("ativo", true)
      .order("custo_pontos")
      .then(({ data }) => setRewards((data ?? []) as Reward[]));
  }, []);
  return rewards;
}

export function usePremium(userId: string | null) {
  const [isPremium, setIsPremium] = useState(false);
  useEffect(() => {
    if (!userId) {
      setIsPremium(false);
      return;
    }
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setIsPremium(!!data?.is_premium));
  }, [userId]);
  return { isPremium, setIsPremium };
}
