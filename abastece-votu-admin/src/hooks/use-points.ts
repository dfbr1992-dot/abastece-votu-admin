import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LedgerEntry = {
  id: string;
  delta: number;
  descricao: string;
  created_at: string;
};

export function usePoints(userId: string | null) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("points_ledger")
      .select("id,delta,descricao,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setEntries((data ?? []) as LedgerEntry[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const balance = entries.reduce((s, e) => s + e.delta, 0);

  const awardForAction = useCallback(
    async (action: "confirm_price") => {
      if (!userId) return;
      await (supabase.rpc as any)("award_points_for_action", { _action: action });
      await refresh();
    },
    [userId, refresh]
  );

  return { entries, balance, loading, refresh, awardForAction };
}
