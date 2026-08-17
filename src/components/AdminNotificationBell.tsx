import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, UserPlus, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export type AdminNotification = {
  id: string;
  type: "novo_cadastro" | "nova_assinatura";
  payload: { user_id?: string | null; email?: string | null; timestamp?: string };
  created_at: string;
  read: boolean;
};

// Inbox do admin: sino com badge de não lidas no header do painel.
// Reutiliza o padrão de polling/Realtime do projeto (TanStack Query).
export function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Erro ao buscar admin_notifications:", error);
      return;
    }
    setNotifications((data ?? []) as AdminNotification[]);
    setUnread(((data ?? []) as AdminNotification[]).filter((n) => !n.read).length);
  }

  useEffect(() => {
    fetchNotifications();

    // Polling a cada 30s (mesmo padrão usado no app principal)
    const interval = setInterval(fetchNotifications, 30_000);

    // Realtime: escuta INSERTs na tabela admin_notifications
    const channel = supabase
      .channel("admin-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;

    const { error } = await supabase
      .from("admin_notifications")
      .update({ read: true })
      .in("id", unreadIds);

    if (error) {
      console.error("Erro ao marcar como lidas:", error);
      return;
    }
    setNotifications((prev: AdminNotification[]) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-lg p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Notificações do administrador"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-[#101424] border-white/10 text-white">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Marcar todas como lidas
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />

        {notifications.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            Nenhuma notificação ainda.
          </div>
        )}

        {notifications.map((n) => (
          <DropdownMenuItem
            key={n.id}
            className="flex flex-col items-start gap-1 px-4 py-3 cursor-default focus:bg-white/5"
          >
            <div className="flex items-center gap-2 w-full">
              {n.type === "novo_cadastro" ? (
                <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className={`text-sm font-medium ${n.read ? "text-gray-400" : "text-white"}`}>
                {n.type === "novo_cadastro" ? "Novo cadastro" : "Novo assinante Pro"}
              </span>
              {!n.read && <span className="ml-auto h-2 w-2 rounded-full bg-blue-500" />}
            </div>
            <p className="text-xs text-gray-500 w-full truncate">
              {n.payload.email ?? `Usuário ${n.payload.user_id ?? "desconhecido"}`}
            </p>
            <p className="text-[10px] text-gray-600">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
