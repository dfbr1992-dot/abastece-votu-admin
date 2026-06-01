import { useEffect, useState, type ComponentType } from "react";
import { ClientOnly } from "@tanstack/react-router";

function MapLoader() {
  const [Comp, setComp] = useState<ComponentType | null>(null);
  useEffect(() => {
    import("./PostosMapInner").then((m) => setComp(() => m.default));
  }, []);
  if (!Comp) return <MapSkeleton />;
  return <Comp />;
}

export function PostosMap() {
  return (
    <div className="glass-card h-56 w-full overflow-hidden rounded-3xl shadow-md shadow-black/20">
      <ClientOnly fallback={<MapSkeleton />}>
        <MapLoader />
      </ClientOnly>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
      Carregando mapa…
    </div>
  );
}
