import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Vehicle = {
  id: string;
  marca: string;
  modelo: string;
  ano: number | null;
  placa: string | null;
  licenciamento_vencimento: string | null;
  seguro_vencimento: string | null;
};

export function useVehicle(userId: string | null) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setVehicle(null);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("vehicles")
      .select("id,marca,modelo,ano,placa,licenciamento_vencimento,seguro_vencimento")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setVehicle((data as Vehicle) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (v: Omit<Vehicle, "id">) => {
      if (!userId) throw new Error("Login necessário");
      if (vehicle) {
        await supabase.from("vehicles").update(v).eq("id", vehicle.id);
      } else {
        await supabase.from("vehicles").insert({ ...v, user_id: userId });
      }
      await refresh();
    },
    [userId, vehicle, refresh]
  );

  return { vehicle, loading, save, refresh };
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
