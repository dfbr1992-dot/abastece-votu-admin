import { Link } from "@tanstack/react-router";
import { LayoutDashboard, MapPin, DollarSign, Wrench, Gift, Image as ImageIcon, LogOut } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-[#1e2330] flex flex-col justify-between p-6">
      <div>
        <div className="mb-8">
          <h1 className="text-xl font-bold">Abastece Votu</h1>
          <p className="text-xs text-gray-400">Painel administrativo</p>
        </div>

        <nav className="space-y-1">
          {[
            { label: "Dashboard", to: "/", icon: LayoutDashboard },
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