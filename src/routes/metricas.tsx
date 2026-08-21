import { createFileRoute } from "@tanstack/react-router";
import { VisitorStatsCard } from "../components/VisitorStatsCard";

export const Route = createFileRoute("/metricas")({
  component: AdminMetricas,
});

function AdminMetricas() {
  return (
    <div className="brand-theme p-6 max-w-5xl">
      <h2 className="text-2xl font-bold text-foreground mb-6">Métricas de Visitantes</h2>
      <VisitorStatsCard />
    </div>
  );
}