import { useEffect, useRef, useState } from "react";
import { recordAdClick, useAdImpression } from "@/hooks/use-ad-analytics";

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
};

const SLIDES: Slide[] = [
  {
    id: "ad-house",
    eyebrow: "Espaço para Anúncio",
    title: "Divulgue seu posto ou serviço aqui",
    subtitle: "Alcance milhares de motoristas em Votuporanga",
    icon: "📣",
    gradient: "from-brand-purple to-primary",
  },
  {
    id: "ad-partner",
    eyebrow: "Parceiro destaque",
    title: "Posto Avenida — Etanol a R$ 3,27",
    subtitle: "Pague no Pix e ganhe 2% de cashback",
    icon: "⛽",
    gradient: "from-primary to-success",
  },
  {
    id: "ad-promo",
    eyebrow: "Promoção da semana",
    title: "Troca de óleo com 20% OFF",
    subtitle: "Agende pelo app — vagas limitadas",
    icon: "🛢️",
    gradient: "from-amber-500 to-brand-purple",
  },
];

export function AdCarousel({ onAdClick }: { onAdClick: (slide: Slide) => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useAdImpression("carousel");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused]);

  const slide = SLIDES[index];

  return (
    <section
      className="mb-4"
      ref={ref as React.RefObject<HTMLElement>}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Publicidade
        </span>
        <span className="text-[10px] text-muted-foreground">Anuncie aqui</span>
      </div>
      <button
        onClick={() => {
          recordAdClick(slide.id);
          onAdClick(slide);
        }}
        className={`relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${slide.gradient} p-4 text-left text-white shadow-md transition active:scale-[0.98]`}
      >
        <span className="absolute right-2 top-2 rounded bg-black/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider backdrop-blur">
          Patrocinado
        </span>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 text-3xl backdrop-blur">
          {slide.icon}
        </div>
        <div className="flex-1 pr-12">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            {slide.eyebrow}
          </p>
          <h4 className="text-sm font-extrabold leading-tight">{slide.title}</h4>
          <p className="mt-0.5 text-[11px] opacity-90">{slide.subtitle}</p>
        </div>
      </button>
      <div className="mt-2 flex justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            aria-label={`Ir para anúncio ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-5 bg-premium-gradient" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
