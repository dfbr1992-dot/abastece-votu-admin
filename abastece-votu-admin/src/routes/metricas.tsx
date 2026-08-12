import { createFileRoute } from "@tanstack/react-router";
import { VisitorStatsCard } from "../components/VisitorStatsCard";

export const Route = createFileRoute("/metricas")({
  component: AdminMetricas,
});

function AdminMetricas() {
  return (
    <div className="p-6 max-w-5xl">
      <h2 className="text-2xl font-bold text-white mb-6">Métricas de Visitantes</h2>
      <VisitorStatsCard />
    </div>
  );
}