import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "../components/Sidebar";
import { useState } from "react";
import { Menu } from "lucide-react";

function RootComponent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Fundo escurecido que aparece atrás do menu aberto no celular */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Ajustado o padding para ser p-4 no mobile e p-8 no desktop */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});