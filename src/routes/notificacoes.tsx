import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, BellRing, Send, Loader2, Users, UserPlus, Crown, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/notificacoes")({
  component: AdminNotificacoes,
});

// Schema de validação reutilizando o padrão Zod já usado no admin (ver premios.tsx)
const notificationSchema = z.object({
  titulo: z.string().trim().min(1, "O título é obrigatório"),
  mensagem: z.string().trim().min(1, "A mensagem é obrigatória"),
  audience: z.enum(["todos", "sem_conta", "com_conta", "assinante"]),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

// Segmentos de audiência disponíveis para envio de push
const AUDIENCE_OPTIONS = [
  { value: "todos", label: "Todos os usuários", icon: Users },
  { value: "sem_conta", label: "Baixaram mas não criaram conta", icon: UserPlus },
  { value: "com_conta", label: "Com conta (não assinantes)", icon: User },
  { value: "assinante", label: "Assinantes Abastece+ Pro", icon: Crown },
] as const;

type Audience = NotificationFormData["audience"];

function AdminNotificacoes() {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [audience, setAudience] = useState<Audience>("todos");
  const [adminPushEnabled, setAdminPushEnabled] = useState(false);

  // 1) Contagem estimada de destinatários por segmento (consulta ao vivo
  //    contra a view push_audience_segments, via RPC service_role).
  const { data: audienceCounts, isLoading: counting } = useQuery({
    queryKey: ["push-audience-counts"],
    queryFn: async () => {
      const { error } = await supabase
        .from("push_audience_segments")
        .select("segmento", { count: "exact", head: true });

      if (error) {
        console.error("Erro ao contar audiências:", error);
        return null;
      }
      const counts: Record<Audience, number | null> = {
        todos: null,
        sem_conta: null,
        com_conta: null,
        assinante: null,
      };
      const totals = await Promise.all(
        (["sem_conta", "com_conta", "assinante"] as const).map(async (seg) => {
          const { count } = await supabase
            .from("push_audience_segments")
            .select("*", { count: "exact", head: true })
            .eq("segmento", seg);
          return { seg, count } as const;
        })
      );
      for (const { seg, count } of totals) counts[seg] = count;
      // 'todos' = soma dos segmentos
      const known = Object.values(counts).filter((c): c is number => c !== null);
      counts.todos = known.length === 3 ? known.reduce((a, b) => a + b, 0) : null;
      return counts;
    },
    refetchInterval: 30_000, // atualiza a cada 30s
  });

  // 2) Envio da notificação: chama a Edge Function send-notification com o
  //    audience selecionado (fallback compatível com a tabela notifications).
  const sendMutation = useMutation({
    mutationFn: async (formData: NotificationFormData) => {
      // Chama a Edge Function (service_role) — caminho principal do push.
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          titulo: formData.titulo,
          mensagem: formData.mensagem,
          audience: formData.audience,
        },
      });

      if (error) throw error;

      // Registro na tabela notifications para manter o histórico/inbox do app.
      const { error: logError } = await supabase.from("notifications").insert([
        {
          titulo: formData.titulo,
          mensagem: formData.mensagem,
          data_envio: new Date().toISOString(),
        },
      ]);
      if (logError) console.warn("Falha ao registrar histórico:", logError);

      return data;
    },
    onSuccess: () => {
      toast.success("Notificação enviada com sucesso!");
      setTitulo("");
      setMensagem("");
      queryClient.invalidateQueries({ queryKey: ["push-audience-counts"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar: " + error.message);
    },
  });

  // 3) Opt-in do admin para receber notificações de novos usuários no próprio
  //    dispositivo (via RPC register_admin_push → admin_push_subscriptions).
  const adminPushMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Seu navegador não suporta notificações push.");
      }
      if (enabled) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          throw new Error("Permissão de notificação negada. Habilite nas configurações do navegador.");
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY_ADMIN),
        });
        const { error } = await supabase.rpc("register_admin_push", {
          _endpoint: subscription.endpoint,
          _p256dh: subscription.getKey("p256dh")
            ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!)))
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
            : "",
          _auth_key: subscription.getKey("auth")
            ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!)))
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
            : "",
        });
        if (error) throw error;
      } else {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
      }
    },
    onSuccess: (_d, enabled) => {
      setAdminPushEnabled(enabled);
      toast.success(enabled ? "Notificações de novos usuários ativadas!" : "Notificações desativadas.");
    },
    onError: (error: any) => {
      toast.error("Erro ao configurar: " + error.message);
      setAdminPushEnabled(!adminPushEnabled);
    },
  });

  async function enviarNotificacao(e: React.FormEvent) {
    e.preventDefault();

    const parsed = notificationSchema.safeParse({ titulo, mensagem, audience });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }

    sendMutation.mutate(parsed.data);
  }

  const estimatedCount = audienceCounts?.[audience];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-400" /> Central de Notificações
        </h1>
        <p className="text-muted-foreground mt-1">
          Envie alertas e avisos para segmentos específicos de usuários do aplicativo.
        </p>
      </div>

      {/* Opt-in de push para o próprio admin */}
      <div className="glass-card p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BellRing className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-200">
              Receber notificações de novos usuários
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Receba um push neste dispositivo quando alguém criar conta ou virar assinante Pro.
            </p>
          </div>
        </div>
        <Switch
          checked={adminPushEnabled}
          onCheckedChange={(v: boolean) => adminPushMutation.mutate(v)}
          aria-label="Receber notificações de novos usuários"
        />
      </div>

      <div className="glass-card p-8 rounded-2xl border border-border bg-card/40 backdrop-blur-xl">
        <form onSubmit={enviarNotificacao} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Título do Alerta</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Novo Posto Parceiro!"
              className="bg-white/5 border-input text-white h-12 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Mensagem</label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Descreva o que os usuários verão na notificação..."
              className="bg-white/5 border-input text-white min-h-[120px] resize-none focus-visible:ring-ring"
            />
          </div>

          {/* Seletor de audiência com estimativa de destinatários ao vivo */}
          <div className="space-y-2">
            <Label htmlFor="audience" className="text-sm font-semibold text-gray-300">
              Público-alvo
            </Label>
            <Select
              value={audience}
              onValueChange={(v: string) => setAudience(v as Audience)}
            >
              <SelectTrigger
                id="audience"
                className="bg-white/5 border-input text-white h-12 w-full focus-visible:ring-ring"
              >
                <SelectValue placeholder="Selecione o público" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="focus:bg-white/10">
                    <span className="flex items-center gap-2">
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Estimativa de destinatários do segmento selecionado */}
            <p className="text-xs text-gray-400 h-4">
              {counting
                ? "Calculando destinatários..."
                : estimatedCount !== undefined && estimatedCount !== null
                  ? `≈ ${estimatedCount} destinatário(s) no segmento selecionado`
                  : audience === "todos"
                    ? "Enviará para todos os usuários inscritos"
                    : "Nenhum destinatário estimado para este segmento"}
            </p>
          </div>

          <Button
            type="submit"
            disabled={sendMutation.isPending}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Enviar para{" "}
                {AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label ?? "todos"}
              </>
            )}
          </Button>
        </form>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
        <p className="text-xs text-blue-400/80 leading-relaxed">
          <strong>Atenção:</strong> Ao clicar em enviar, esta mensagem será disparada
          instantaneamente para o segmento selecionado. Certifique-se de que as
          informações estão corretas.
        </p>
      </div>
    </div>
  );
}

// VAPID public key reutilizada do app principal (não regenerar)
const VAPID_PUBLIC_KEY_ADMIN =
  "BA57Z49Blal4DE1oz5cgBAFIkhinHfIxFlf2vV0EY0XEpx-1nRQGmEwpZp_1v1OXKMGo4TIFevl169srNrNEM50";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
