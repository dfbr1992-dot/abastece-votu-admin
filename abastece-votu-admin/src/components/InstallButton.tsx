import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    setIsIOS(ios);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setInstalled(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const installedHandler = () => setInstalled(true);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    if (isIOS) setShowIOSHelp(true);
  };

  if (!deferred && !isIOS) return null;

  return (
    <>
      <button
        onClick={onClick}
        className="fixed left-1/2 top-3 z-[2000] -translate-x-1/2 rounded-full bg-premium-gradient px-4 py-2 text-xs font-bold text-white shadow-lg"
      >
        📲 Adicionar à tela inicial
      </button>

      {showIOSHelp && (
        <div
          className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/50 p-4"
          onClick={() => setShowIOSHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-5 text-sm text-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-bold">Instalar no iPhone</h3>
            <ol className="space-y-2 text-muted-foreground">
              <li>1. Toque no botão <strong>Compartilhar</strong> ⬆️ do Safari.</li>
              <li>2. Escolha <strong>"Adicionar à Tela de Início"</strong>.</li>
              <li>3. Toque em <strong>Adicionar</strong>.</li>
            </ol>
            <button
              onClick={() => setShowIOSHelp(false)}
              className="mt-4 w-full rounded-lg bg-premium-gradient px-3 py-2 font-bold text-white"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
