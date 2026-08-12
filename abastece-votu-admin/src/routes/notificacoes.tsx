import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/notificacoes")({
  component: AdminNotificacoes,
});

function AdminNotificacoes() {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  async function enviarNotificacao(e: React.FormEvent) {
    e.preventDefault();
    
    if (!titulo.trim() || !mensagem.trim()) {
      return toast.error("Preencha todos os campos");
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.from("notifications").insert([
        {
          titulo,
          mensagem,
          data_envio: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      toast.success("Notificação enviada para todos os usuários!");
      setTitulo("");
      setMensagem("");
    } catch (error: any) {
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-400" /> Central de Notificações
        </h1>
        <p className="text-muted-foreground mt-1">
          Envie alertas e avisos importantes para todos os usuários do aplicativo.
        </p>
      </div>

      <div className="glass-card p-8 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl">
        <form onSubmit={enviarNotificacao} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Título do Alerta</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Novo Posto Parceiro!"
              className="bg-white/5 border-white/10 text-white h-12 focus-visible:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Mensagem</label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Descreva o que os usuários verão na notificação..."
              className="bg-white/5 border-white/10 text-white min-h-[120px] resize-none focus-visible:ring-blue-500"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Enviar para todos os usuários
              </>
            )}
          </Button>
        </form>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
        <p className="text-xs text-blue-400/80 leading-relaxed">
          <strong>Atenção:</strong> Ao clicar em enviar, esta mensagem será disparada instantaneamente para toda a base de usuários cadastrados. Certifique-se de que as informações estão corretas.
        </p>
      </div>
    </div>
  );
}
