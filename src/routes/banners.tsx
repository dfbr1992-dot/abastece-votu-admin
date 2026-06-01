import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/banners")({ component: BannersPage });

const schema = z.object({
  titulo: z.string().trim().min(1).max(120),
  link_url: z.string().trim().max(500).optional().or(z.literal("")),
  prioridade: z.coerce.number().int().min(0).max(999),
  ativo: z.boolean(),
});
type FormData = z.infer<typeof schema>;
type Banner = FormData & { id: string; image_url: string };

function BannersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);

  const { data: banners, isLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("prioridade", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Banner[];
    },
  });

  async function remove(b: Banner) {
    if (!confirm("Excluir este banner?")) return;
    const path = b.image_url.split("/banners/").pop();
    if (path) await supabase.storage.from("banners").remove([path]);
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Banner removido");
    qc.invalidateQueries({ queryKey: ["banners"] });
    qc.invalidateQueries({ queryKey: ["count", "banners"] });
  }

  async function reorder(b: Banner, dir: 1 | -1) {
    const { error } = await supabase.from("banners").update({ prioridade: Math.max(0, b.prioridade + dir) }).eq("id", b.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["banners"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Banners</h1>
          <p className="text-muted-foreground">Anúncios exibidos no carrossel do app mobile.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="w-4 h-4" /> Novo</Button></DialogTrigger>
          <BannerDialog key={editing?.id ?? "new"} initial={editing} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["banners"] }); qc.invalidateQueries({ queryKey: ["count", "banners"] }); }} />
        </Dialog>
      </div>

      {isLoading ? <div className="text-muted-foreground text-sm">Carregando…</div> :
        !banners?.length ? (
          <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">Nenhum banner cadastrado.</div>
        ) : (
          <div className="grid gap-3">
            {banners.map((b) => (
              <div key={b.id} className="glass-card flex items-center gap-4 rounded-2xl p-3">
                <img src={b.image_url} alt={b.titulo} className="w-24 h-16 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-white">{b.titulo}</div>
                  <div className="text-xs text-muted-foreground truncate">{b.link_url || "Sem link"}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">Prioridade {b.prioridade}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${b.ativo ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-muted-foreground"}`}>{b.ativo ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <Button size="icon" variant="ghost" onClick={() => reorder(b, 1)}><ArrowUp className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => reorder(b, -1)}><ArrowDown className="w-4 h-4" /></Button>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(b)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function BannerDialog({ initial, onClose }: { initial: Banner | null; onClose: () => void }) {
  const [form, setForm] = useState<FormData>({
    titulo: initial?.titulo ?? "",
    link_url: initial?.link_url ?? "",
    prioridade: initial?.prioridade ?? 0,
    ativo: initial?.ativo ?? true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!initial && !file) return toast.error("Selecione uma imagem");

    setSaving(true);
    try {
      let image_url = initial?.image_url ?? "";
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("banners").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        image_url = supabase.storage.from("banners").getPublicUrl(path).data.publicUrl;
      }
      const payload = { ...parsed.data, link_url: parsed.data.link_url || null, image_url };
      const { error } = initial
        ? await supabase.from("banners").update(payload).eq("id", initial.id)
        : await supabase.from("banners").insert(payload);
      if (error) throw error;
      toast.success("Banner salvo");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} banner</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Link (opcional)</Label><Input type="url" value={form.link_url ?? ""} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." /></div>
        <div className="space-y-2">
          <Label>Imagem {initial && "(deixe em branco para manter)"}</Label>
          <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {initial && <img src={initial.image_url} alt="" className="mt-2 w-full max-h-32 object-cover rounded" />}
        </div>
        <div className="space-y-2"><Label>Prioridade (maior = aparece primeiro)</Label><Input type="number" min={0} max={999} value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: Number(e.target.value) })} /></div>
        <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /></div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
