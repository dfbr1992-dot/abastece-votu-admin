import { createRootRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { Sidebar } from "../components/Sidebar";
import { useState, useEffect } from "react";
import { Menu, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import logoAbasteceVotu from "@/assets/logo-abastece-votu.gif";

function RootComponent() {
  const { isAdmin, isAuthenticated, loading, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redireciona para o login se não estiver autenticado e não estiver na página de login
  useEffect(() => {
    if (!loading && !isAuthenticated && location.pathname !== "/login") {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080a12] text-white">
        <img src={logoAbasteceVotu} alt="Logo Abastece Votu" className="mb-8 h-32 w-auto" />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se estiver na página de login, apenas renderiza o conteúdo (Outlet) sem a Sidebar
  if (location.pathname === "/login") {
    return <Outlet />;
  }

  // Se não estiver autenticado, não renderiza nada (o useEffect cuidará do redirecionamento)
  if (!isAuthenticated) {
    return null;
  }

  // 1. VERIFICAÇÃO DE ADMIN (Supabase)
  // Se estiver logado mas não for admin, mostra a tela de acesso negado.
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080a12] p-4 text-white">
        <div className="w-full max-w-md bg-[#101424] border border-red-500/20 p-8 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-gray-400 text-sm mb-6">
            Você está logado, mas não tem permissões de administrador para acessar este painel.
          </p>
          <button
            onClick={() => signOut()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl text-sm transition-all"
          >
            Sair e trocar de conta
          </button>
        </div>
      </div>
    );
  }

  // 2. LAYOUT DO PAINEL ADMIN (Usuário logado e admin)
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0B0F19] text-white">
      {/* Barra superior exclusiva para o Mobile */}
      <div className="md:hidden flex items-center p-4 border-b border-[#1e2330] bg-[#080a12]">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-4">Abastece Votu</h1>
      </div>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onLogout={() => signOut()} 
      />
      
      {/* Fundo escurecido atrás do menu mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
