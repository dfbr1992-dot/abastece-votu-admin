import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2, Gift } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/premios")({
  component: AdminPremios,
});

const rewardSchema = z.object({
  nome: z.string().trim().min(1, "O nome é obrigatório"),
  descricao: z.string().trim().optional(),
  custo_pontos: z.coerce.number().min(0, "O custo deve ser positivo"),
  ativo: z.boolean(),
  emoji: z.string().trim().min(1, "O emoji é obrigatório"),
});

type RewardFormData = z.infer<typeof rewardSchema>;
type Reward = RewardFormData & { id: string };

function AdminPremios() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // 1. Busca de Dados com React Query
  const { data: premios, isLoading } = useQuery({
    queryKey: ["premios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .order("custo_pontos", { ascending: true });

      if (error) throw error;
      return data as Reward[];
    },
  });

  // 2. Mutação para Salvar/Editar
  const saveMutation = useMutation({
    mutationFn: async (formData: RewardFormData) => {
      if (editingReward) {
        const { error } = await supabase
          .from("rewards")
          .update(formData)
          .eq("id", editingReward.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rewards").insert([formData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingReward ? "Prêmio atualizado!" : "Prêmio cadastrado!");
      queryClient.invalidateQueries({ queryKey: ["premios"] });
      setIsModalOpen(false);
      setEditingReward(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  // 3. Mutação para Deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rewards").delete().eq("id", id);
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
    setEditingReward(null);
    setIsModalOpen(true);
  }

  function handleEditarPremio(premio: Reward) {
    setEditingReward(premio);
    setIsModalOpen(true);
  }

  function handleDeletar(id: string) {
    if (confirm("Tem certeza que deseja excluir este prêmio?")) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" /> Prêmios
          </h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de prêmios disponíveis para resgate no aplicativo.
          </p>
        </div>
        <Button onClick={handleNovoPremio} className="bg-primary hover:bg-primary/90 text-white font-bold">
          <Plus className="w-4 h-4 mr-2" /> Novo Prêmio
        </Button>
      </div>

      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !premios?.length ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            Nenhum prêmio cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-white/5 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Prêmio</th>
                  <th className="px-6 py-4 font-semibold">Descrição</th>
                  <th className="px-6 py-4 font-semibold">Custo (Pts)</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {premios.map((premio) => (
                  <tr key={premio.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                      <span className="text-xl">{premio.emoji || "🎁"}</span>
                      {premio.nome}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">
                      {premio.descricao}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">
                      {premio.custo_pontos} pts
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
        <RewardDialog 
          initial={editingReward} 
          onSave={(data) => saveMutation.mutate(data)} 
          onClose={() => setIsModalOpen(false)}
          isSaving={saveMutation.isPending}
        />
      </Dialog>
    </div>
  );
}

function RewardDialog({ 
  initial, 
  onSave, 
  onClose,
  isSaving 
}: { 
  initial: Reward | null; 
  onSave: (d: RewardFormData) => void; 
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<RewardFormData>({
    nome: initial?.nome ?? "",
    descricao: initial?.descricao ?? "",
    custo_pontos: initial?.custo_pontos ?? 0,
    ativo: initial?.ativo ?? true,
    emoji: initial?.emoji ?? "🎁",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = rewardSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    onSave(parsed.data);
  }

  return (
    <DialogContent className="sm:max-w-[425px] bg-[#161618] border-white/10 text-white">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">
          {initial ? "Editar Prêmio" : "Cadastrar Novo Prêmio"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4 pt-4">
        <div className="flex gap-3">
          <div className="w-20">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Emoji</label>
            <Input
              value={form.emoji}
              onChange={(e) => setForm({ ...form, emoji: e.target.value })}
              placeholder="🎁"
              className="bg-white/5 border-white/10 text-center text-lg focus-visible:ring-primary"
              required
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome do Prêmio</label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Pão de Queijo"
              className="bg-white/5 border-white/10 focus-visible:ring-primary"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Custo em Pontos</label>
          <Input
            type="number"
            value={form.custo_pontos}
            onChange={(e) => setForm({ ...form, custo_pontos: Number(e.target.value) })}
            placeholder="Ex: 150"
            className="bg-white/5 border-white/10 focus-visible:ring-primary"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Descrição</label>
          <Textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Detalhes sobre a cortesia..."
            className="bg-white/5 border-white/10 resize-none h-20 focus-visible:ring-primary"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/10 p-3 bg-white/5">
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
            className="text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-white font-bold min-w-[100px]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
