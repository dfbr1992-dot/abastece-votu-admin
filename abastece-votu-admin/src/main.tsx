import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // 🚀 IMPORTADO AQUI
import { routeTree } from "./routeTree.gen";
import "./index.css";

// 1. Inicializa o QueryClient para gerenciar os caches de requisições
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache padrão (os dados são considerados novos por 5 min)
      gcTime: 1000 * 60 * 60 * 24, // 24 horas de Garbage Collection (mantém no cache mesmo inativo)
      retry: 1,
      refetchOnWindowFocus: false, // Evita refetch desnecessário ao trocar de aba no admin
      refetchOnReconnect: 'always',
    },
  },
});

// 2. Cria a instância do roteador com preloading otimizado
const router = createRouter({ 
  routeTree,
  defaultPreload: 'intent', // Precarrega a rota quando o usuário passa o mouse sobre o link
  defaultPreloadStaleTime: 0,
});

// Registra o roteador para tipagem estática do TypeScript
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// 3. Renderiza o app envelopado com o Provedor do React Query
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);