import { Link } from "@tanstack/react-router";
import { LayoutDashboard, TrendingUp, MapPin, DollarSign, Wrench, Gift, Image as ImageIcon, LogOut, X } from "lucide-react";

// 1. Adicionamos as propriedades isOpen e onClose para controlar a Sidebar
export function Sidebar({ isOpen = false, onClose = () => {} }: { isOpen?: boolean; onClose?: () => void }) {
  return (
    // 2. Classes atualizadas: Fixa no mobile, relativa no desktop. Usa translate para esconder/mostrar.
    <aside 
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#080a12] border-r border-[#1e2330] flex flex-col justify-between p-6 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Abastece Votu</h1>
            <p className="text-xs text-gray-400">Painel administrativo</p>
          </div>
          {/* 3. Botão de fechar (X) visível apenas no mobile */}
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4. onClick={onClose} adicionado na nav para fechar o menu ao tocar em um link */}
        <nav className="space-y-1" onClick={onClose}>
          {[
            { label: "Dashboard", to: "/", icon: LayoutDashboard },
            { label: "Insights", to: "/insights", icon: TrendingUp },
            { label: "Postos", to: "/postos", icon: MapPin },
            { label: "Preços", to: "/precos", icon: DollarSign },
            { label: "Serviços", to: "/servicos", icon: Wrench },
            { label: "Prêmios", to: "/premios", icon: Gift },
            { label: "Banners", to: "/banners", icon: ImageIcon },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              activeProps={{ className: "bg-[#3b82f6] text-white" }}
              inactiveProps={{ className: "text-gray-400 hover:text-white hover:bg-[#1e2330]" }}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="space-y-4 border-t border-[#1e2330] pt-4">
        <p className="text-[10px] text-gray-500 truncate">dfbr1992@gmail.com</p>
        <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </aside>
  );
}