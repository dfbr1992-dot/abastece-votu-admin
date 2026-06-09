import { Link } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  Wrench, 
  Gift, 
  Image as ImageIcon, 
  LogOut, 
  X, 
  Users, 
  Bell,
  ExternalLink,
  Smartphone
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";

export function Sidebar({ 
  isOpen = false, 
  onClose = () => {}, 
  onLogout = () => {} 
}: { 
  isOpen?: boolean; 
  onClose?: () => void; 
  onLogout?: () => void; 
}) {
  const { user, profile } = useAuth();
  const userEmail = user?.email || profile?.email || "Administrador";

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#080a12] border-r border-[#1e2330] flex flex-col justify-between p-6 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Abastece Votu</h1>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Painel de Controle</p>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-1" onClick={onClose}>
          {[
            { label: "Dashboard", to: "/", icon: LayoutDashboard },
            { label: "Insights", to: "/insights", icon: TrendingUp },
            { label: "Postos", to: "/postos", icon: MapPin },
            { label: "Preços", to: "/precos", icon: DollarSign },
            { label: "Serviços", to: "/servicos", icon: Wrench },
            { label: "Prêmios", to: "/premios", icon: Gift },
            { label: "Banners", to: "/banners", icon: ImageIcon },
            { label: "Clientes", to: "/clientes", icon: Users },
            { label: "Notificações", to: "/notificacoes", icon: Bell },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              activeProps={{ className: "bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20" }}
              inactiveProps={{ className: "text-gray-400 hover:text-white hover:bg-[#1e2330]" }}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}

          <div className="pt-4 mt-4 border-t border-[#1e2330] space-y-1">
            <p className="px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Ecossistema</p>
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1e2330] transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Ver Site Principal
            </a>
            <a
              href="https://abastevotu.lovable.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1e2330] transition-all"
            >
              <Smartphone className="w-4 h-4" />
              Acessar App
            </a>
          </div>
        </nav>
      </div>

      <div className="space-y-4 border-t border-[#1e2330] pt-4">
        <div className="px-4">
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Logado como:</p>
          <p className="text-xs text-gray-300 truncate font-semibold">{userEmail}</p>
        </div>
        <button 
          onClick={onLogout} 
          className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="w-4 h-4" /> Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
