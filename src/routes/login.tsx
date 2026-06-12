import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import logoAbasteceVotu from "@/assets/logo-abastece-votu.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect });
    });
  }, [navigate, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const cleanEmail = email.trim();
    console.log("[Login] Tentando autenticar:", cleanEmail);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password: password 
      });
      
      if (error) {
        console.error("[Login] Erro do Supabase:", error);
        
        if (error.message.includes("Failed to fetch") || error.name === "AuthRetryableFetchError") {
          throw new Error("Erro de Conexão: Não foi possível alcançar o servidor do Supabase. Verifique sua internet ou se a URL da API no .env está correta.");
        }
        
        throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
      }
      
      console.log("[Login] Sucesso!", data.user?.email);
      // Armazenar flag para mostrar o pop-up de boas-vindas no dashboard
      localStorage.setItem("showWelcomeDouglas", "true");
      navigate({ to: redirect });
    } catch (err: any) {
      console.error("[Login] Erro capturado:", err);
      const msg = err.message || "Ocorreu um erro inesperado.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0B0F19] p-4 text-white sm:p-6">
      <div className="mb-8 text-center">
        <img src={logoAbasteceVotu} alt="Logo Abastece Votu" className="mx-auto h-24 w-auto" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="glass-card overflow-hidden rounded-[24px] border border-white/5 bg-card/40 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-white">Painel Administrativo</h2>
            <p className="text-sm text-muted-foreground">Faça login para continuar</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">E-mail</Label>
              <Input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="voce@email.com" 
                className="bg-white/5 border-white/10" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Senha</Label>
              <Input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Sua senha" 
                className="bg-white/5 border-white/10" 
              />
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-[12px] text-red-400 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider" 
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
