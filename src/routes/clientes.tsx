import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Search, UserCheck, User } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/clientes")({
  component: AdminClientes,
});

interface Profile {
  id: string;
  email: string;
  is_premium: boolean;
  created_at: string;
  nome?: string;
}

function AdminClientes() {
  const [search, setSearch] = useState("");

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const filteredClientes = clientes?.filter(c => 
    c.email?.toLowerCase().includes(search.toLowerCase()) || 
    c.nome?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Clientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e visualize a base de usuários do Abastece Votu.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            placeholder="Buscar por nome ou email..." 
            className="pl-10 bg-white/5 border-white/10 text-white focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
        ) : !filteredClientes?.length ? (
          <div className="p-20 text-center text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/5 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Data Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredClientes.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${c.is_premium ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-400'}`}>
                          {c.is_premium ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-medium text-white">{c.nome || "Sem nome"}</div>
                          <div className="text-xs text-gray-500">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.is_premium ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        {c.is_premium ? "ASSINANTE" : "GRÁTIS"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
