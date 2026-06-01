import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { MapPin, DollarSign, Wrench, Image as ImageIcon, Users, UserCheck, User } from "lucide-react";

export const Route = createFileRoute("/")({
  component: AdminDashboard,
});

// Atualizado para buscar contagens de tabelas ou condições específicas
function useCount(table: "postos" | "servicos" | "banners" | "precos", filter?: { column: string, value: any }) {
  return useQuery({
    queryKey: ["count", table, filter],
    queryFn: async () => {
      let query = supabase.from(table).select("*", { count: "exact", head: true });
      if (filter) {
        query = query.eq(filter.column, filter.value);
      }
      const { count } = await query;
      return count ?? 0;
    },
  });
}

function AdminDashboard() {
  const postos = useCount("postos");
  const precos = useCount("precos");
  const servicos = useCount("servicos");
  const banners = useCount("banners");
  
  // Queries específicas para usuários baseadas na sua tabela 'profiles'
  // Supondo que você tenha uma coluna 'is_premium' ou 'subscription_type'
  const freeUsers = useCount("profiles", { column: "is_premium", value: false });
  const paidUsers = useCount("profiles", { column: "is_premium", value: true });

  const cards = [
    { to: "/admin/postos", label: "Postos", icon: MapPin, count: postos.data, color: "bg-emerald-500" },
    { to: "/admin/precos", label: "Preços", icon: DollarSign, count: precos.data, color: "bg-blue-500" },
    { to: "/admin/servicos", label: "Serviços", icon: Wrench, count: servicos.data, color: "bg-amber-500" },
    { to: "/admin/banners", label: "Banners", icon: ImageIcon, count: banners.data, color: "bg-purple-500" },
  ] as const;

  const userCards = [
    { label: "Contas Grátis", count: freeUsers.data, icon: User, color: "bg-slate-600" },
    { label: "Assinantes", count: paidUsers.data, icon: UserCheck, color: "bg-yellow-500" },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">Dashboard</h1>
      <p className="text-muted-foreground mb-6">Visão geral do hub de gestão.</p>

      {/* Grid de Gestão Operacional */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.to} to={c.to} className="glass-card group rounded-2xl p-5 transition-shadow hover:shadow-lg hover:shadow-black/30">
              <div className={`w-10 h-10 rounded-xl ${c.color} text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-white">{c.count ?? "—"}</div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
            </Link>
          );
        })}
      </div>

      {/* Grid de Métricas de Usuários */}
      <h2 className="text-lg font-semibold text-white mb-4">Métricas de Usuários</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {userCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="glass-card flex items-center gap-4 rounded-2xl p-5">
              <div className={`w-12 h-12 rounded-xl ${c.color} text-white flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{c.count ?? "0"}</div>
                <div className="text-sm text-muted-foreground">{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card mt-8 rounded-2xl p-6">
        <h2 className="mb-2 font-semibold text-white">Bem-vindo ao painel</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie postos, atualize preços, monitore assinantes e publique anúncios.
        </p>
      </div>
    </div>
  );
}