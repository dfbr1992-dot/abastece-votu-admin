import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/servicos")({ component: ServicosPage });

type Categoria = "lava_rapido" | "oficina_mecanica" | "troca_oleo";
const LABELS: Record<Categoria, string> = {
  lava_rapido: "Lava Rápido",
  oficina_mecanica: "Oficina Mecânica",
  troca_oleo: "Troca de Óleo",
};

const schema = z.object({
  nome: z.string().trim().min(1).max(120),
  nome_servico: z.string().trim().min(1).max(120),
  preco: z.coerce.number().min(0, "O preço deve ser positivo"),
  categoria: z.enum(["lava_rapido", "oficina_mecanica", "troca_oleo"]),
  endereco: z.string().max(255).optional().nullable(),
  telefone: z.string().max(30).optional().nullable(),
  horario: z.string().max(60).optional().nullable(),
  ativo: z.boolean(),
});
type FormData = z.infer<typeof schema>;
type Servico = FormData & { id: string };

function ServicosPage() {
  const [tab, setTab] = useState<Categoria>("lava_rapido");
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">Serviços Parceiros</h1>
      <p className="text-muted-foreground mb-6">Gerencie estética automotiva e mecânica em Votuporanga.</p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Categoria)}>
        <TabsList className="mb-4">
          {(Object.keys(LABELS) as Categoria[]).map((c) => (
            <TabsTrigger key={c} value={c}>{LABELS[c]}</TabsTrigger>
          ))}
        </TabsList>
        {(Object.keys(LABELS) as Categoria[]).map((c) => (
          <TabsContent key={c} value={c}><CategoriaList categoria={c} /></TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CategoriaList({ categoria }: { categoria: Categoria }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Servico | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["servicos", categoria],
    queryFn: async () => {
      const { data, error } = await supabase.from("servicos").select("*").eq("categoria", categoria).order("nome");
      if (error) throw error;
      return data as Servico[];
    },
  });

  async function save(form: FormData) {
    const { error } = editing
      ? await supabase.from("servicos").update(form).eq("id", editing.id)
      : await supabase.from("servicos").insert({ ...form, categoria });
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    qc.invalidateQueries({ queryKey: ["servicos", categoria] });
    qc.invalidateQueries({ queryKey: ["count", "servicos"] });
    setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir este serviço?")) return;
    const { error } = await supabase.from("servicos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    qc.invalidateQueries({ queryKey: ["servicos", categoria] });
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="w-4 h-4" /> Novo</Button>
          </DialogTrigger>
          <ServicoDialog key={editing?.id ?? "new"} initial={editing} categoria={categoria} onSave={save} />
        </Dialog>
      </div>

      {isLoading ? <div className="text-muted-foreground text-sm">Carregando…</div> :
        !data?.length ? (
          <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">Nenhum serviço nesta categoria.</div>
        ) : (
          <div className="glass-card overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-secondary/80 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Serviço</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3 hidden md:table-cell">Endereço</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-3 font-medium text-white">{s.nome}</td>
                    <td className="px-4 py-3 text-white/80">{s.nome_servico}</td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">
                      {s.preco ? `R$ ${Number(s.preco).toFixed(2).replace('.', ',')}` : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{s.endereco ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${s.ativo ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-muted-foreground"}`}>{s.ativo ? "Ativo" : "Inativo"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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

function ServicoDialog({ initial, categoria, onSave }: { initial: Servico | null; categoria: Categoria; onSave: (d: FormData) => void }) {
  const [form, setForm] = useState<FormData>({
    nome: initial?.nome ?? "",
    nome_servico: initial?.nome_servico ?? "",
    preco: initial?.preco ?? 0,
    categoria,
    endereco: initial?.endereco ?? "",
    telefone: initial?.telefone ?? "",
    horario: initial?.horario ?? "",
    ativo: initial?.ativo ?? true,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    onSave(parsed.data);
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} {LABELS[categoria]}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        
        <div className="space-y-2">
          <Label>Nome da Empresa</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Rei do Óleo" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Serviço Oferecido</Label>
            <Input value={form.nome_servico} onChange={(e) => setForm({ ...form, nome_servico: e.target.value })} placeholder="Ex: Troca de Óleo" required />
          </div>
          <div className="space-y-2">
            <Label>Preço (R$)</Label>
            <Input type="number" step="0.01" value={form.preco || ""} onChange={(e) => setForm({ ...form, preco: e.target.value as any })} placeholder="0.00" required />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Endereço</Label>
          <Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="17999999999" />
          </div>
          <div className="space-y-2">
            <Label>Horário</Label>
            <Input value={form.horario ?? ""} onChange={(e) => setForm({ ...form, horario: e.target.value })} placeholder="Seg-Sex 08:00-18:00" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Label>Ativo</Label>
          <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
        </div>

        <DialogFooter className="pt-2">
          <Button type="submit">Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}