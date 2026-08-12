import { useState } from 'react';
import { useVisitorStats } from '@/hooks/useVisitorStats';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

type Periodo = 7 | 14 | 30;

export function VisitorStatsCard() {
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const { data, isLoading, error } = useVisitorStats(periodo);

  const totalNovos = data?.reduce((acc, d) => acc + Number(d.novos_usuarios), 0) ?? 0;
  const totalAtivos = data?.reduce((acc, d) => acc + Number(d.usuarios_ativos), 0) ?? 0;
  const totalInstalacoes = data?.reduce((acc, d) => acc + Number(d.novas_instalacoes), 0) ?? 0;

  return (
    <div className="rounded-2xl border border-[#1e2330] bg-[#12141c] p-6 shadow-xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h3 className="text-lg font-bold text-white">Métricas de Visitantes</h3>
        <div className="flex gap-2">
          {([7, 14, 30] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                periodo === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1e2330] text-zinc-400 hover:text-white'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-zinc-400">Carregando métricas...</p>}

      {error && (
        <p className="text-sm text-red-400">
          Erro ao carregar métricas: {error.message || 'verifique sua sessão (faça logout e login novamente).'}
        </p>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="rounded-xl bg-[#1e2330] p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{totalNovos}</div>
              <div className="text-xs text-zinc-400 mt-1">Novos usuários</div>
            </div>
            <div className="rounded-xl bg-[#1e2330] p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{totalAtivos}</div>
              <div className="text-xs text-zinc-400 mt-1">Logins no período</div>
            </div>
            <div className="rounded-xl bg-[#1e2330] p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{totalInstalacoes}</div>
              <div className="text-xs text-zinc-400 mt-1">Instalações PWA</div>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradNovos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAtivos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradInstalacoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" />
                <XAxis
                  dataKey="dia"
                  tickFormatter={(v) => format(new Date(v), 'dd/MM', { locale: ptBR })}
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={{ stroke: '#1e2330' }}
                  tickLine={{ stroke: '#1e2330' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={{ stroke: '#1e2330' }}
                  tickLine={{ stroke: '#1e2330' }}
                />
                <Tooltip
                  labelFormatter={(v) => format(new Date(v), 'dd/MM/yyyy', { locale: ptBR })}
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid #1e2330',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="novos_usuarios"
                  name="Novos usuários"
                  stroke="#3b82f6"
                  fill="url(#gradNovos)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="usuarios_ativos"
                  name="Usuários ativos"
                  stroke="#10b981"
                  fill="url(#gradAtivos)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="novas_instalacoes"
                  name="Instalações PWA"
                  stroke="#f59e0b"
                  fill="url(#gradInstalacoes)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-muted-foreground pt-3 border-t border-[#1e2330] mt-4">
            Novos usuários = cadastros no período. Usuários ativos = logins no
            período. Instalações PWA = registros em app_installations (visitantes
            que instalaram o app, inclusive sem login).
          </p>
        </>
      )}
    </div>
  );
}
