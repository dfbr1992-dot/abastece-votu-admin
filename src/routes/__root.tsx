import { createRootRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { 
  LayoutDashboard, 
  Users, 
  Fuel, 
  Gift, 
  TrendingUp, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation(); // 🚀 Hook para descobrir em qual página estamos
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Administrador");

  // Verifica se o usuário está logado ao carregar o painel admin
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        // Se não houver usuário logado, chuta de volta para a tela de login
        navigate({ to: "/login" });
      } else {
        setAdminName(user.user_metadata?.display_name || "Administrador");
      }
    });
  }, [navigate]);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair do painel.");
    } else {
      toast.success("Sessão encerrada com sucesso.");
      navigate({ to: "/login" });
    }
  }

  // Itens do Menu com as rotas novas
  const menuItems = [
    { label: "Dashboard", to: "/", icon: LayoutDashboard },
    { label: "Insights", to: "/insights", icon: TrendingUp },
    { label: "Preços Pista", to: "/precos", icon: Fuel },
    { label: "Clientes", to: "/clientes", icon: Users },
    { label: "Prêmios", to: "/premios", icon: Gift },
    { label: "Notificações", to: "/notificacoes", icon: Bell },
  ];

  const isLoginPage = location.pathname === "/login";

  // 🚀 Se for a página de login, renderiza SÓ a tela de login, limpa e centralizada
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white font-sans antialiased flex items-center justify-center p-4">
        <Outlet />
      </div>
    );
  }

  // Se NÃO for a página de login, renderiza o layout completo com a barra lateral
  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-white font-sans antialiased">
      
      {/* Botão de Menu Mobile */}
      <button 
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-secondary/80 p-2 border border-white/10 backdrop-blur md:hidden text-white hover:bg-secondary"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Lateral */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 transform bg-card/20 border-r border-white/5 p-6 backdrop-blur-xl transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo / Identidade */}
        <div className="relative mb-8 pt-4 md:pt-0">
          <div className="absolute top-1/2 left-1/4 h-[80px] w-[80px] -translate-y-1/2 rounded-full bg-primary/20 blur-[30px] pointer-events-none" />
          <h2 className="text-lg font-black tracking-wider uppercase bg-premium-gradient bg-clip-text text-transparent">
            Votu Admin
          </h2>
          <p className="text-[10px] text-muted-foreground font-bold tracking-widest mt-0.5">SISTEMA DE GESTÃO</p>
        </div>

        {/* Menu de Navegação */}
        <nav className="space-y-1.5 flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              activeProps={{
                className: "bg-primary text-primary-foreground font-bold shadow-md shadow-blue-950/50",
              }}
              inactiveProps={{
                className: "text-muted-foreground hover:text-white hover:bg-white/[0.02]",
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Rodapé da Sidebar - Usuário & Sair */}
        <div className="border-t border-white/5 pt-4 mt-4 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="truncate">
              <p className="text-[11px] font-bold truncate leading-none">{adminName}</p>
              <span className="text-[9px] text-muted-foreground tracking-wide uppercase font-semibold">Gestor</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Área de Conteúdo Principal */}
      <main className="flex-1 p-4 pt-20 md:p-8 md:pt-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {/* Renderiza a página ativa com base na rota */}
        <Outlet />
      </main>

    </div>
  );
}