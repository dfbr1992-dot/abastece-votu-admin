import { useEffect, useRef } from "react";

const KEY = "abastece_ads_metrics";

type Metrics = Record<string, { views: number; clicks: number }>;

function read(): Metrics {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}") as Metrics;
  } catch {
    return {};
  }
}

function bump(id: string, field: "views" | "clicks") {
  if (typeof window === "undefined") return;
  const m = read();
  m[id] = m[id] || { views: 0, clicks: 0 };
  m[id][field] += 1;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // ignore
  }
}

export function useAdImpression(id: string) {
  const ref = useRef<HTMLElement | null>(null);
  const seen = useRef(false);

  useEffect(() => {
    if (!ref.current || seen.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !seen.current) {
            seen.current = true;
            bump(id, "views");
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id]);

  return ref;
}

export function recordAdClick(id: string) {
  bump(id, "clicks");
}
