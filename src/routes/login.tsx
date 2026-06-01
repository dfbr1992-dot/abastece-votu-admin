import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import logoAbasteceVotu from "@/assets/logo-abastece-votu.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  head: () => ({ meta: [{ title: "Acesso — Abastece Votu" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Estados de Mensagens (Alertas)
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Estados dos Campos
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

  // Máscara simples para WhatsApp (XX) XXXXX-XXXX
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

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          // Captura especificamente o erro de e-mail não confirmado
          if (error.message.includes("Email not confirmed")) {
            throw new Error("Atenção: Você precisa confirmar seu e-mail antes de entrar. Verifique sua caixa de entrada ou spam!");
          }
          throw new Error("E-mail ou senha incorretos.");
        }
        
        toast.success("Bem-vindo de volta ao Abastece Votu!");
        navigate({ to: redirect });
      } else {
        // Validações básicas de cadastro
        if (!name.trim()) throw new Error("Por favor, digite seu nome.");
        if (password !== confirmPassword) throw new Error("As senhas não coincidem.");
        if (whatsapp.replace(/\D/g, "").length < 10) throw new Error("Número de WhatsApp inválido.");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: name.trim(),
              whatsapp: whatsapp.replace(/\D/g, ""),
            },
          },
        });
        
        if (error) throw error;
        
        // Exibe o banner de sucesso em vez de redirecionar imediatamente
        setSuccessMsg("Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail. Verifique a caixa de entrada e o spam.");
        toast.success("Conta criada!");
        
        // Limpa as senhas e muda para o modo login para quando o usuário voltar do e-mail
        setPassword("");
        setConfirmPassword("");
        setMode("login");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar solicitação";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Função auxiliar para mudar de modo e limpar alertas
  function switchMode(newMode: "login" | "signup") {
    setMode(newMode);
    setErrorMsg("");
    setSuccessMsg("");
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0B0F19] p-4 text-white sm:p-6">
      <div className="relative w-full max-w-[400px] animate-fade-in">
        
        {/* Topo com Logo e Glow Premium */}
        <div className="relative mb-8 text-center">
          <div className="absolute top-1/2 left-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[50px] pointer-events-none" />
          <img
            src={logoAbasteceVotu}
            alt="Abastece Votu"
            className="relative z-10 mx-auto h-16 w-auto object-contain select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Card Principal */}
        <div className="glass-card overflow-hidden rounded-[24px] border border-white/5 bg-card/40 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl">
          
          {/* Alternador de Abas Estilo Fintech */}
          <div className="mb-6 flex rounded-full bg-secondary/50 p-1 border border-white/[0.03]">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold transition-all duration-300 ${
                mode === "login"
                  ? "bg-premium-gradient text-white shadow-md shadow-blue-950/40"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold transition-all duration-300 ${
                mode === "signup"
                  ? "bg-premium-gradient text-white shadow-md shadow-blue-950/40"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Formulário Dinâmico */}
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5 animate-slide-in-from-top-1">
                <Label htmlFor="name" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Nome Completo</Label>
                <Input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome Completo" className="h-10 border-white/10 bg-secondary/30 focus-visible:ring-primary" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="voce@email.com" className="h-10 border-white/10 bg-secondary/30 focus-visible:ring-primary" />
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5 animate-slide-in-from-top-1">
                <Label htmlFor="whatsapp" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">WhatsApp</Label>
                <Input id="whatsapp" type="tel" required value={whatsapp} onChange={(e) => handleWhatsappChange(e.target.value)} placeholder="(17) 99999-9999" className="h-10 border-white/10 bg-secondary/30 focus-visible:ring-primary" />
              </div>
            )}

            <div className="space-y-1.5 relative">
              <Label htmlFor="password" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="h-10 border-white/10 bg-secondary/30 focus-visible:ring-primary" />
              
              {/* Botão de Esqueci a Senha - Apenas no modo Login */}
              {mode === "login" && (
                <div className="flex justify-end mt-1.5">
                  <Link 
                    to="/recuperar-senha" 
                    className="text-[10px] text-muted-foreground hover:text-white transition-colors"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
              )}
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5 animate-slide-in-from-top-1">
                <Label htmlFor="confirmPassword" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Confirmar Senha</Label>
                <Input id="confirmPassword" type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita sua senha" className="h-10 border-white/10 bg-secondary/30 focus-visible:ring-primary" />
              </div>
            )}

            {/* Alertas Visuais (Erros ou Sucesso) */}
            {errorMsg && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-[11px] text-red-500 text-center font-medium animate-fade-in">
                {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-400 text-center font-medium animate-fade-in">
                {successMsg}
              </div>
            )}

            {/* Botão de Ação Principal */}
            <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-lg transition duration-300 hover:opacity-90 mt-2" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{mode === "login" ? "Entrar na Conta" : "Finalizar Cadastro"}</span>
              )}
            </Button>
          </form>
        </div>

        {/* Botão Inferior de Acesso Livre (Visitante) */}
        <div className="text-center mt-6">
          <button 
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-muted-foreground transition-all duration-200 hover:text-white bg-white/[0.02] border border-white/5 hover:border-white/10 px-4 py-2.5 rounded-full backdrop-blur"
          >
            Continuar sem conta — Explorar app <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}