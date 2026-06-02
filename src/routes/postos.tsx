import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

  function openNew() { 
    setEditing(null); 
    setOpen(true); 
  }
  
  function openEdit(p: Posto) { 
    setEditing(p); 
    setOpen(true); 
  }

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
        
        {/* Botão de abrir modal agora está separado do Dialog para evitar conflitos de estado */}
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Novo
        </Button>
      </div>

      {/* Dialog renderizado condicionalmente na raiz para garantir z-index correto */}
      <Dialog open={open} onOpenChange={setOpen}>
        <PostoDialog key={editing?.id ?? "new"} initial={editing} onSave={save} />
      </Dialog>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando…</div>
      ) : !postos?.length ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">
          Nenhum posto cadastrado. Clique em <strong>Novo</strong> para começar.
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 hidden md:table-cell font-medium">Endereço</th>
                <th className="px-4 py-3 hidden lg:table-cell font-medium">Coordenadas</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {postos.map((p) => (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{p.nome}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{p.endereco}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {p.lat && p.lng ? <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.lat}, {p.lng}</span> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.ativo ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-muted-foreground border border-white/10"}`}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} className="hover:bg-white/10 text-gray-400 hover:text-white">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)} className="hover:bg-red-500/20 text-gray-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
    /* Classes de cor de fundo e borda adicionadas para garantir visibilidade no tema escuro */
    <DialogContent className="bg-[#0B0F19] text-white border border-white/10 sm:max-w-[450px]">
      <DialogHeader>
        <DialogTitle className="text-xl">{initial ? "Editar posto" : "Novo posto"}</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={submit} className="space-y-5 pt-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Nome</Label>
          <Input 
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500" 
            value={form.nome} 
            onChange={(e) => setForm({ ...form, nome: e.target.value })} 
            required 
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-gray-300">Endereço</Label>
          <Input 
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500" 
            value={form.endereco} 
            onChange={(e) => setForm({ ...form, endereco: e.target.value })} 
            required 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Latitude</Label>
            <Input 
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500" 
              type="number" 
              step="any" 
              value={form.lat ?? ""} 
              onChange={(e) => setForm({ ...form, lat: e.target.value === "" ? null : Number(e.target.value) })} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Longitude</Label>
            <Input 
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500" 
              type="number" 
              step="any" 
              value={form.lng ?? ""} 
              onChange={(e) => setForm({ ...form, lng: e.target.value === "" ? null : Number(e.target.value) })} 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Abertura</Label>
            <Input 
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500" 
              placeholder="06:00" 
              value={form.horario_abertura ?? ""} 
              onChange={(e) => setForm({ ...form, horario_abertura: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Fechamento</Label>
            <Input 
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500" 
              placeholder="22:00" 
              value={form.horario_fechamento ?? ""} 
              onChange={(e) => setForm({ ...form, horario_fechamento: e.target.value })} 
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
          <Label className="text-gray-300 cursor-pointer">Posto Ativo</Label>
          <Switch 
            checked={form.ativo} 
            onCheckedChange={(v) => setForm({ ...form, ativo: v })} 
          />
        </div>
        
        <DialogFooter className="pt-2">
          <Button type="button" variant="ghost" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))} className="text-gray-400 hover:text-white hover:bg-white/10">
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}