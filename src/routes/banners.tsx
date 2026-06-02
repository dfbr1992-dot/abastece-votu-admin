import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/banners")({ component: BannersPage });

// Posições estratégicas mapeadas para o aplicativo de celular
const POSICOES = {
  topo: { label: "Topo da Tela Inicial", tamanho: "Recomendado: 1200x600px (2:1)" },
  meio: { label: "Meio (Entre Postos)", tamanho: "Recomendado: 1200x400px (3:1)" },
  popup: { label: "Pop-up de Entrada", tamanho: "Recomendado: 800x1200px (Vertical)" },
};

type PosicaoKey = keyof typeof POSICOES;

const schema = z.object({
  titulo: z.string().trim().min(1, "Obrigatório").max(100),
  imagem_url: z.string().url("Insira uma URL de imagem válida"),
  posicao: z.enum(["topo", "meio", "popup"]),
  link_destino: z.string().optional().nullable(),
  ativo: z.boolean(),
});

type FormData = z.infer<typeof schema>;
type Banner = FormData & { id: string };

function BannersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);

  const { data: banners, isLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("posicao");
      if (error) throw error;
      return data as Banner[];
    },
  });

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(b: Banner) {
    setEditing(b);
    setOpen(true);
  }

  async function save(form: FormData) {
    const { error } = editing
      ? await supabase.from("banners").update(form).eq("id", editing.id)
      : await supabase.from("banners").insert(form);

    if (error) return toast.error(error.message);

    toast.success(editing ? "Banner atualizado" : "Banner criado");
    qc.invalidateQueries({ queryKey: ["banners"] });
    setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir este banner? Ele sumirá do aplicativo imediatamente.")) return;
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Banner removido");
    qc.invalidateQueries({ queryKey: ["banners"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Banners do App</h1>
          <p className="text-muted-foreground">Gerencie os destaques visuais exibidos no celular.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Novo Banner
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <BannerDialog key={editing?.id ?? "new"} initial={editing} onSave={save} onCancel={() => setOpen(false)} />
      </Dialog>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando…</div>
      ) : !banners?.length ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground border border-white/10">
          Nenhum banner configurado. Clique em <strong>Novo Banner</strong> para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="glass-card bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="relative aspect-[2/1] w-full rounded-xl overflow-hidden bg-black/40 mb-3 border border-white/5 flex items-center justify-center group">
                  {b.imagem_url ? (
                    <img src={b.imagem_url} alt={b.titulo} className="object-cover w-full h-full" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-600" />
                  )}
                  <span className="absolute top-2 left-2 bg-black/70 text-blue-400 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border border-white/10">
                    {POSICOES[b.posicao]?.label}
                  </span>
                </div>
                
                <h3 className="text-white font-semibold text-base truncate">{b.titulo}</h3>
                {b.link_destino && (
                  <a href={b.link_destino} target="_blank" rel="noreferrer" className="text-xs text-blue-400 flex items-center gap-1 mt-1 hover:underline">
                    Link de destino <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${b.ativo ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-muted-foreground border border-white/10"}`}>
                  {b.ativo ? "Exibindo" : "Pausado"}
                </span>

                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(b)} className="hover:bg-white/10 text-gray-400 hover:text-white">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(b.id)} className="hover:bg-red-500/20 text-gray-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BannerDialog({ initial, onSave, onCancel }: { initial: Banner | null; onSave: (d: FormData) => void; onCancel: () => void }) {
  const [form, setForm] = useState<FormData>({
    titulo: initial?.titulo ?? "",
    imagem_url: initial?.imagem_url ?? "",
    posicao: initial?.posicao ?? "topo",
    link_destino: initial?.link_destino ?? "",
    ativo: initial?.ativo ?? true,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    onSave(parsed.data);
  }

  return (
    <DialogContent className="max-w-md bg-[#0B0F19] text-white border border-white/10">
      <DialogHeader>
        <DialogTitle className="text-xl">{initial ? "Editar Banner" : "Novo Banner"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Título Interno do Banner</Label>
          <Input
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ex: Campanha Gasolina Aditivada - Junho"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">Posição no Aplicativo Móvel</Label>
          <select
            className="w-full h-10 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm focus-visible:ring-blue-500"
            value={form.posicao}
            onChange={(e) => setForm({ ...form, posicao: e.target.value as PosicaoKey })}
          >
            {(Object.keys(POSICOES) as PosicaoKey[]).map((key) => (
              <option key={key} value={key} className="bg-[#0B0F19] text-white">
                {POSICOES[key].label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-blue-400 font-medium">{POSICOES[form.posicao]?.tamanho}</p>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">URL da Imagem do Banner</Label>
          <Input
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500"
            value={form.imagem_url}
            onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
            placeholder="https://linkdaimagem.com/foto.png"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">Link de Ação ao Clicar (Opcional)</Label>
          <Input
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500"
            value={form.link_destino ?? ""}
            onChange={(e) => setForm({ ...form, link_destino: e.target.value })}
            placeholder="Ex: https://posto-votu.com/promocao"
          />
        </div>

        <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
          <Label className="text-gray-300 cursor-pointer">Banner Ativo (Visível no App)</Label>
          <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-gray-400 hover:text-white hover:bg-white/10">
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
            Salvar Banner
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}