import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"; // Removido o que não usava para tirar os warnings
import { Loader2, TrendingUp, Gift, DollarSign } from "lucide-react";

export const Route = createFileRoute("/insights")({
  component: AdminInsights,
});

// Definindo a interface para o TypeScript não reclamar do 'any'
interface ProfileData {
  is_premium: boolean | null;
  created_at: string;
}

function AdminInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ["insights-data"],
    queryFn: async () => {
      const { data: users } = await supabase.from("profiles").select("is_premium, created_at");
      const { data: resgates } = await supabase.from("resgates").select("premio_id");
      
      // Forçando a tipagem para o TypeScript aceitar o filtro sem chiar
      return { 
        users: (users as ProfileData[]) || [], 
        resgates 
      };
    },
  });

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

  const totalAssinantes = data?.users?.filter((u: ProfileData) => u.is_premium).length || 0;
  const totalGratis = data?.users?.filter((u: ProfileData) => !u.is_premium).length || 0;
  const pieData = [{ name: "Assinantes", value: totalAssinantes }, { name: "Grátis", value: totalGratis }];

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-primary" /> Insights de Gestão
      </h1>

      {/* 1. Conversão (Funil) e Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-card/40 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Conversão: Grátis vs Assinantes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} dataKey="value">
                  <Cell fill="#EAB308" />
                  <Cell fill="#64748B" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Financeiro */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-card/40 backdrop-blur-xl flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Receita Recorrente Estimada</div>
          <div className="text-4xl font-black text-white mt-2">R$ {totalAssinantes * 9},90</div>
          <p className="text-xs text-muted-foreground mt-2">Baseado em {totalAssinantes} assinantes ativos</p>
        </div>
      </div>

      {/* 3. Prêmios (Performance) */}
      <div className="glass-card p-6 rounded-2xl border border-white/5 bg-card/40 backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" /> Top Resgates
        </h2>
        <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl">
          <p className="text-muted-foreground text-sm">Dados de resgates em processamento...</p>
        </div>
      </div>
    </div>
  );
}