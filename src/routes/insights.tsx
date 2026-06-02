import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Loader2, TrendingUp, Gift, DollarSign, Users } from "lucide-react";

export const Route = createFileRoute("/insights")({
  component: AdminInsights,
});

interface ProfileData {
  is_premium: boolean | null;
  created_at: string;
}

interface Resgate {
  premio_id: string;
}

function AdminInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ["insights-data"],
    queryFn: async () => {
      const { data: users } = await supabase.from("profiles").select("is_premium, created_at");
      const { data: resgates } = await supabase.from("resgates").select("premio_id");
      
      return { 
        users: (users as ProfileData[]) || [], 
        resgates: (resgates as Resgate[]) || [] 
      };
    },
  });

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

  const totalAssinantes = data?.users?.filter((u: ProfileData) => u.is_premium).length || 0;
  const totalGratis = data?.users?.filter((u: ProfileData) => !u.is_premium).length || 0;
  const pieData = [{ name: "Assinantes", value: totalAssinantes }, { name: "Grátis", value: totalGratis }];

  // Contagem simples de resgates por ID (para exemplificar o gráfico)
  const contagemResgates = data?.resgates.reduce((acc: any, curr: any) => {
    acc[curr.premio_id] = (acc[curr.premio_id] || 0) + 1;
    return acc;
  }, {});
  
  const barData = Object.entries(contagemResgates || {}).map(([name, value]) => ({ name: `ID: ${name.slice(0, 5)}`, value }));

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-primary" /> Insights de Gestão
      </h1>

      {/* 1. Conversão e Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-card/40 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Conversão: Grátis vs Assinantes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={5}>
                  <Cell fill="#EAB308" />
                  <Cell fill="#64748B" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-card/40 backdrop-blur-xl flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Receita Recorrente Estimada</div>
          <div className="text-4xl font-black text-white mt-2">R$ {totalAssinantes * 9},90</div>
          <p className="text-xs text-muted-foreground mt-2">Baseado em {totalAssinantes} assinantes ativos</p>
        </div>
      </div>

      {/* 2. Prêmios (Performance Real) */}
      <div className="glass-card p-6 rounded-2xl border border-white/5 bg-card/40 backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" /> Volume de Resgates por Prêmio
        </h2>
        <div className="h-64">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="value" fill="#aa3bff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center border border-dashed border-white/10 rounded-xl">
              <p className="text-muted-foreground text-sm">Nenhum resgate encontrado até o momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}