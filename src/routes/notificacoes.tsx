import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Send, Loader2 } from "lucide-react";

export const Route = createFileRoute("/notificacoes")({
  component: AdminNotificacoes,
});

function AdminNotificacoes() {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  async function enviarNotificacao() {
    if (!titulo || !mensagem) return alert("Preencha todos os campos!");
    setLoading(true);

    // Aqui inserimos na tabela de notificações. 
    // Seu app mobile deve estar configurado para exibir mensagens dessa tabela.
    const { error } = await supabase.from("notifications").insert([
      {
        titulo,
        mensagem,
        data_envio: new Date().toISOString(),
      },
    ]);

    setLoading(false);
    if (error) {
      alert("Erro ao enviar: " + error.message);
    } else {
      alert("Notificação enviada com sucesso!");
      setTitulo("");
      setMensagem("");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Bell className="w-6 h-6 text-primary" /> Central de Notificações
      </h1>

      <div className="glass-card rounded-xl border border-white/10 p-6 space-y-4">
        <div>
          <label className="text-sm font-semibold text-muted-foreground block mb-2">Título da Notificação</label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Oferta Relâmpago!"
            className="bg-white/5 border-white/10"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-muted-foreground block mb-2">Mensagem</label>
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Digite aqui o texto que aparecerá para o usuário..."
            className="bg-white/5 border-white/10 h-32"
          />
        </div>

        <Button 
          onClick={enviarNotificacao} 
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Enviar para todos os usuários
        </Button>
      </div>
    </div>
  );
}