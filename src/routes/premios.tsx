import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/premios")({
  component: AdminPremios,
});

interface Reward {
  id?: string;
  nome: string;
  descricao: string;
  custo_pontos: number;
  ativo: boolean;
  emoji: string;
}

function AdminPremios() {
  const [premios, setPremios] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado para o formulário (Novo/Edição)
  const [formData, setFormData] = useState<Reward>({
    nome: "",
    descricao: "",
    custo_pontos: 0,
    ativo: true,
    emoji: "🎁",
  });

  useEffect(() => {
    fetchPremios();
  }, []);

  async function fetchPremios() {
    setLoading(true);
    const { data, error } = await supabase
      .from("rewards")
      .select("*")
      .order("custo_pontos", { ascending: true });

    if (error) {
      console.error("Erro ao buscar prêmios:", error);
    } else {
      setPremios(data || []);
    }
    setLoading(false);
  }

  // Abre o modal para Criar Novo
  function handleNovoPremio() {
    setFormData({
      nome: "",
      descricao: "",
      custo_pontos: 0,
      ativo: true,
      emoji: "🎁",
    });
    setIsModalOpen(true);
  }

  // Abre o modal para Editar
  function handleEditarPremio(premio: Reward) {
    setFormData(premio);
    setIsModalOpen(true);
  }

  // Salva ou Atualiza no Supabase
  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (formData.id) {
      // Modo Edição
      const { error } = await supabase
        .from("rewards")
        .update({
          nome: formData.nome,
          descricao: formData.descricao,
          custo_pontos: Number(formData.custo_pontos),
          ativo: formData.ativo,
          emoji: formData.emoji,
        })
        .eq("id", formData.id);

      if (error) console.error("Erro ao atualizar:", error);
    } else {
      // Modo Criação
      const { error } = await supabase.from("rewards").insert([
        {
          nome: formData.nome,
          descricao: formData.descricao,
          custo_pontos: Number(formData.custo_pontos),
          ativo: formData.ativo,
          emoji: formData.emoji,
        },
      ]);

      if (error) console.error("Erro ao inserir:", error);
    }

    setSaving(false);
    setIsModalOpen(false);
    fetchPremios(); // Recarrega a lista atualizada
  }

  async function deletarPremio(id: string) {
    if (!confirm("Tem certeza que deseja excluir este prêmio?")) return;

    const { error } = await supabase.from("rewards").delete().eq("id", id);
    if (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao deletar prêmio.");
    } else {
      fetchPremios();
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

      {/* Tabela de Prêmios */}
      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : premios.length === 0 ? (
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
                          onClick={() => deletarPremio(premio.id!)}
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

      {/* Modal de Criação / Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#161618] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {formData.id ? "Editar Prêmio" : "Cadastrar Novo Prêmio"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4 pt-4">
            <div className="flex gap-3">
              <div className="w-20">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Emoji</label>
                <Input
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="🎁"
                  className="bg-white/5 border-white/10 text-center text-lg focus-visible:ring-primary"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome do Prêmio</label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
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
                value={formData.custo_pontos}
                onChange={(e) => setFormData({ ...formData, custo_pontos: Number(e.target.value) })}
                placeholder="Ex: 150"
                className="bg-white/5 border-white/10 focus-visible:ring-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Descrição</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
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
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-white font-bold min-w-[100px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}