import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/postos")({ component: PostosPage });

const schema = z.object({
  nome: z.string().trim().min(1, "Obrigatório").max(120),
  endereco: z.string().trim().min(1, "Obrigatório").max(255),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  horario_abertura: z.string().max(20).optional().nullable(),
  horario_fechamento: z.string().max(20).optional().nullable(),
  ativo: z.boolean(),
});
type FormData = z.infer<typeof schema>;
type Posto = FormData & { id: string };

function PostosPage() {
  const qc = useQueryClient();
  const { data: postos, isLoading } = useQuery({
    queryKey: ["postos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("postos").select("*").order("nome");
      if (error) throw error;
      return data as Posto[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Posto | null>(null);

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(p: Posto) { setEditing(p); setOpen(true); }

  async function save(form: FormData) {
    const payload = { ...form, lat: form.lat ?? null, lng: form.lng ?? null };
    const { error } = editing
      ? await supabase.from("postos").update(payload).eq("id", editing.id)
      : await supabase.from("postos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Posto atualizado" : "Posto criado");
    qc.invalidateQueries({ queryKey: ["postos"] });
    qc.invalidateQueries({ queryKey: ["count", "postos"] });
    setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir este posto? Isso também removerá os preços vinculados.")) return;
    const { error } = await supabase.from("postos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Posto removido");
    qc.invalidateQueries({ queryKey: ["postos"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Postos</h1>
          <p className="text-muted-foreground">Catálogo de postos em Votuporanga.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button></DialogTrigger>
          <PostoDialog key={editing?.id ?? "new"} initial={editing} onSave={save} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando…</div>
      ) : !postos?.length ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">
          Nenhum posto cadastrado. Clique em <strong>Novo</strong> para começar.
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-secondary/80 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3 hidden md:table-cell">Endereço</th>
                <th className="px-4 py-3 hidden lg:table-cell">Coordenadas</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {postos.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3 font-medium text-white">{p.nome}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{p.endereco}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {p.lat && p.lng ? <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.lat}, {p.lng}</span> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.ativo ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-muted-foreground"}`}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PostoDialog({ initial, onSave }: { initial: Posto | null; onSave: (d: FormData) => void }) {
  const [form, setForm] = useState<FormData>({
    nome: initial?.nome ?? "",
    endereco: initial?.endereco ?? "",
    lat: initial?.lat ?? null,
    lng: initial?.lng ?? null,
    horario_abertura: initial?.horario_abertura ?? "",
    horario_fechamento: initial?.horario_fechamento ?? "",
    ativo: initial?.ativo ?? true,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    onSave(parsed.data);
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar posto" : "Novo posto"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="any" value={form.lat ?? ""} onChange={(e) => setForm({ ...form, lat: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="any" value={form.lng ?? ""} onChange={(e) => setForm({ ...form, lng: e.target.value === "" ? null : Number(e.target.value) })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Abertura</Label><Input placeholder="06:00" value={form.horario_abertura ?? ""} onChange={(e) => setForm({ ...form, horario_abertura: e.target.value })} /></div>
          <div className="space-y-2"><Label>Fechamento</Label><Input placeholder="22:00" value={form.horario_fechamento ?? ""} onChange={(e) => setForm({ ...form, horario_fechamento: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /></div>
        <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}