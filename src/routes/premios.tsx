import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2, Gift, Crown } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/premios")({
  component: AdminPremios,
});

const premioSchema = z.object({
  nome: z.string().trim().min(1, "O nome é obrigatório"),
  posto_id: z.string().uuid("Selecione um posto"),
  pontos_necessarios: z.coerce
    .number()
    .int("Deve ser um número inteiro")
    .positive("Deve ser maior que zero"),
  exclusivo_premium: z.boolean(),
  ativo: z.boolean(),
});

type PremioFormData = z.infer<typeof premioSchema>;
type Posto = { id: string; nome: string };
type Premio = PremioFormData & { id: string; postos: { nome: string } | null };

function AdminPremios() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPremio, setEditingPremio] = useState<Premio | null>(null);
  const [postoFilter, setPostoFilter] = useState<string>("all");

  const { data: postos } = useQuery({
    queryKey: ["postos-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("postos").select("id, nome").order("nome");
      if (error) throw error;
      return data as Posto[];
    },
  });

  const { data: premios, isLoading } = useQuery({
    queryKey: ["premios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premios")
        .select("*, postos(nome)")
        .order("posto_id")
        .order("pontos_necessarios", { ascending: true });

      if (error) throw error;
      return data as Premio[];
    },
  });

  // Quantos prêmios ativos cada posto tem, usado nas opções do filtro
  const ativosPorPosto = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of premios ?? []) {
      if (p.ativo) map.set(p.posto_id, (map.get(p.posto_id) ?? 0) + 1);
    }
    return map;
  }, [premios]);

  const premiosFiltrados = useMemo(() => {
    if (!premios) return [];
    if (postoFilter === "all") return premios;
    return premios.filter((p) => p.posto_id === postoFilter);
  }, [premios, postoFilter]);

  // 2. Mutação para Salvar/Editar
  const saveMutation = useMutation({
    mutationFn: async (formData: PremioFormData) => {
      if (editingPremio) {
        const { error } = await supabase
          .from("premios")
          .update(formData)
          .eq("id", editingPremio.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("premios").insert([formData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPremio ? "Prêmio atualizado!" : "Prêmio cadastrado!");
      queryClient.invalidateQueries({ queryKey: ["premios"] });
      setIsModalOpen(false);
      setEditingPremio(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  // 3. Mutação para Deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("premios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prêmio removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["premios"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar: " + error.message);
    },
  });

  function handleNovoPremio() {
    setEditingPremio(null);
    setIsModalOpen(true);
  }

  function handleEditarPremio(premio: Premio) {
    setEditingPremio(premio);
    setIsModalOpen(true);
  }

  function handleDeletar(id: string) {
    if (confirm("Tem certeza que deseja excluir este prêmio?")) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className="brand-theme space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" /> Prêmios
          </h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de prêmios resgatáveis por pontos, por posto.
          </p>
        </div>
        <Button onClick={handleNovoPremio} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
          <Plus className="w-4 h-4 mr-2" /> Novo Prêmio
        </Button>
      </div>

      <div className="w-full sm:w-80">
        <Select value={postoFilter} onValueChange={setPostoFilter}>
          <SelectTrigger className="bg-white/5 border-input text-white">
            <SelectValue placeholder="Filtrar por posto" />
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground border-border">
            <SelectItem value="all">
              Todos os postos ({premios?.filter((p) => p.ativo).length ?? 0} ativos)
            </SelectItem>
            {postos?.map((posto) => (
              <SelectItem key={posto.id} value={posto.id}>
                {posto.nome} ({ativosPorPosto.get(posto.id) ?? 0} ativos)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !premiosFiltrados.length ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            {postoFilter === "all"
              ? "Nenhum prêmio cadastrado."
              : "Este posto ainda não tem prêmios cadastrados."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-white/5 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Posto</th>
                  <th className="px-6 py-4 font-semibold">Prêmio</th>
                  <th className="px-6 py-4 font-semibold">Pontos</th>
                  <th className="px-6 py-4 font-semibold text-center">Premium</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {premiosFiltrados.map((premio) => (
                  <tr key={premio.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">
                      {premio.postos?.nome ?? "—"}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{premio.nome}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">
                      {premio.pontos_necessarios} pts
                    </td>
                    <td className="px-6 py-4 text-center">
                      {premio.exclusivo_premium && (
                        <Crown className="w-4 h-4 text-yellow-500 inline-block" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${premio.ativo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {premio.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                          onClick={() => handleEditarPremio(premio)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          onClick={() => handleDeletar(premio.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <PremioDialog
          initial={editingPremio}
          postos={postos ?? []}
          defaultPostoId={postoFilter !== "all" ? postoFilter : undefined}
          onSave={(data) => saveMutation.mutate(data)}
          onClose={() => setIsModalOpen(false)}
          isSaving={saveMutation.isPending}
        />
      </Dialog>
    </div>
  );
}

function PremioDialog({
  initial,
  postos,
  defaultPostoId,
  onSave,
  onClose,
  isSaving,
}: {
  initial: Premio | null;
  postos: Posto[];
  defaultPostoId?: string;
  onSave: (d: PremioFormData) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<PremioFormData>({
    nome: initial?.nome ?? "",
    posto_id: initial?.posto_id ?? defaultPostoId ?? "",
    pontos_necessarios: initial?.pontos_necessarios ?? 0,
    exclusivo_premium: initial?.exclusivo_premium ?? false,
    ativo: initial?.ativo ?? true,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = premioSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    onSave(parsed.data);
  }

  return (
    <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">
          {initial ? "Editar Prêmio" : "Cadastrar Novo Prêmio"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4 pt-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Posto</label>
          <Select
            value={form.posto_id}
            onValueChange={(v) => setForm({ ...form, posto_id: v })}
          >
            <SelectTrigger className="bg-white/5 border-input focus-visible:ring-primary">
              <SelectValue placeholder="Selecione um posto" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border-border">
              {postos.map((posto) => (
                <SelectItem key={posto.id} value={posto.id}>
                  {posto.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome do Prêmio</label>
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Pão de Queijo"
            className="bg-white/5 border-input focus-visible:ring-primary"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Pontos Necessários</label>
          <Input
            type="number"
            min="1"
            step="1"
            value={form.pontos_necessarios || ""}
            onChange={(e) => setForm({ ...form, pontos_necessarios: Number(e.target.value) })}
            placeholder="Ex: 150"
            className="bg-white/5 border-input focus-visible:ring-primary"
            required
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-white/5">
          <div className="space-y-0.5">
            <label className="text-sm font-medium">Exclusivo Premium</label>
            <p className="text-xs text-muted-foreground">Só fica visível para assinantes Abastece+ Pro.</p>
          </div>
          <Switch
            checked={form.exclusivo_premium}
            onCheckedChange={(checked) => setForm({ ...form, exclusivo_premium: checked })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-white/5">
          <div className="space-y-0.5">
            <label className="text-sm font-medium">Prêmio Ativo</label>
            <p className="text-xs text-muted-foreground">Disponibiliza o prêmio imediatamente para resgate.</p>
          </div>
          <Switch
            checked={form.ativo}
            onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
          />
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-foreground hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold min-w-[100px]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
