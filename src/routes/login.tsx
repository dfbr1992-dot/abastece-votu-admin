import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, ShieldAlert } from "lucide-react";
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
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect });
    });
  }, [navigate, redirect]);

  function handleWhatsappChange(value: string) {
    const raw = value.replace(/\D/g, "");
    if (raw.length <= 11) {
      let masked = raw;
      if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
      if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
      setWhatsapp(masked);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = email.trim();
    console.log("[Login] Tentando autenticar:", cleanEmail);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password: password 
        });
        
        if (error) {
          console.error("[Login] Erro do Supabase:", error);
          
          if (error.message.includes("Failed to fetch") || error.name === "AuthRetryableFetchError") {
            throw new Error("Erro de Conexão: Não foi possível alcançar o servidor do Supabase. Verifique sua internet ou se a URL da API no .env está correta.");
          }
          
          if (error.message.includes("Email not confirmed")) {
            throw new Error("E-mail não confirmado. Verifique sua caixa de entrada.");
          }

          throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
        }
        
        console.log("[Login] Sucesso!", data.user?.email);
        toast.success("Bem-vindo de volta!");
        navigate({ to: redirect });
      } else {
        // Lógica de Cadastro
        if (!name.trim()) throw new Error("Nome é obrigatório.");
        if (password !== confirmPassword) throw new Error("As senhas não coincidem.");

        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              display_name: name.trim(),
              whatsapp: whatsapp.replace(/\D/g, ""),
            },
          },
        });
        
        if (error) throw error;
        
        setSuccessMsg("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
        toast.success("Cadastro realizado!");
        setMode("login");
      }
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0B0F19] p-4 text-white sm:p-6">
      <div className="relative w-full max-w-[400px]">
        <div className="relative mb-8 text-center">
          <img src={logoAbasteceVotu} alt="Logo" className="mx-auto h-16 w-auto" />
        </div>

        <div className="glass-card overflow-hidden rounded-[24px] border border-white/5 bg-card/40 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex rounded-full bg-secondary/50 p-1 border border-white/[0.03]">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold transition-all ${
                mode === "login" ? "bg-blue-600 text-white shadow-lg" : "text-muted-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold transition-all ${
                mode === "signup" ? "bg-blue-600 text-white shadow-lg" : "text-muted-foreground"
              }`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Nome Completo</Label>
                <Input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="bg-white/5 border-white/10" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">E-mail</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className="bg-white/5 border-white/10" />
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">WhatsApp</Label>
                <Input type="tel" required value={whatsapp} onChange={(e) => handleWhatsappChange(e.target.value)} placeholder="(17) 99999-9999" className="bg-white/5 border-white/10" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Senha</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" className="bg-white/5 border-white/10" />
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Confirmar Senha</Label>
                <Input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" className="bg-white/5 border-white/10" />
              </div>
            )}

            {errorMsg && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-[12px] text-red-400 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}
            
            {successMsg && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-[12px] text-emerald-400 text-center font-medium">
                {successMsg}
              </div>
            )}

            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === "login" ? "Entrar" : "Criar Conta")}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6">
          <button 
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="text-xs font-bold text-muted-foreground hover:text-white flex items-center gap-2 mx-auto transition-colors"
          >
            Continuar como visitante <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
