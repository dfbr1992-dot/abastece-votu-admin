import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { Loader2, Users } from "lucide-react";

export const Route = createFileRoute("/clientes")({
  component: AdminClientes,
});

interface Profile {
  id: string;
  email: string;
  is_premium: boolean;
  created_at: string;
}

function AdminClientes() {
  const [clientes, setClientes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientes();
  }, []);

  async function fetchClientes() {
    setLoading(true);
    // Ajuste 'profiles' se o nome da sua tabela for diferente
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error) setClientes(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Users className="w-6 h-6 text-primary" /> Clientes
      </h1>

      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Data Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-white">{c.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${c.is_premium ? 'bg-yellow-500/10 text-yellow-500' : 'bg-slate-500/10 text-slate-400'}`}>
                      {c.is_premium ? "ASSINANTE" : "GRÁTIS"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}