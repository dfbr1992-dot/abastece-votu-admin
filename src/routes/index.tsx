import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, DollarSign, Wrench, Image as ImageIcon, UserCheck, User, Download } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  component: AdminDashboard,
});

function useCount(table: "postos" | "servicos" | "banners" | "precos" | "profiles", filter?: { column: string, value: any }) {
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
  const [showWelcome, setShowWelcome] = useState(false);
  const postos = useCount("postos");
  const precos = useCount("precos");
  const servicos = useCount("servicos");
  const banners = useCount("banners");
  
  const freeUsers = useCount("profiles", { column: "is_premium", value: false });
  const paidUsers = useCount("profiles", { column: "is_premium", value: true });
  // @ts-ignore - ignorando erro de tipo caso a tabela ainda não tenha sido criada no Supabase
  const pwaInstalls = useCount("app_installations");

  useEffect(() => {
    const shouldShow = localStorage.getItem("showWelcomeDouglas");
    if (shouldShow === "true") {
      setShowWelcome(true);
      localStorage.removeItem("showWelcomeDouglas");
    }
  }, []);

  const cards = [
    { to: "/postos", label: "Postos", icon: MapPin, count: postos.data, color: "bg-emerald-500" },
    { to: "/precos", label: "Preços", icon: DollarSign, count: precos.data, color: "bg-blue-500" },
    { to: "/servicos", label: "Serviços", icon: Wrench, count: servicos.data, color: "bg-amber-500" },
    { to: "/banners", label: "Banners", icon: ImageIcon, count: banners.data, color: "bg-purple-500" },
  ] as const;

  const userCards = [
    { label: "Contas Grátis", count: freeUsers.data, icon: User, color: "bg-slate-600" },
    { label: "Assinantes", count: paidUsers.data, icon: UserCheck, color: "bg-yellow-500" },
    { label: "Instalações PWA", count: pwaInstalls.data, icon: Download, color: "bg-indigo-500" },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">Dashboard</h1>
      <p className="text-muted-foreground mb-6">Visão geral do hub de gestão.</p>

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

      <h2 className="text-lg font-semibold text-white mb-4">Métricas de Usuários e App</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-[425px] bg-[#0B0F19] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-500">Acesso Autorizado</DialogTitle>
            <DialogDescription className="text-muted-foreground text-lg pt-4">
              Bem vindo Douglas
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
