import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, Edit, Loader2, Gift, Crown, ChevronsUpDown, Power, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/premios")({
  component: AdminPremios,
});

type Posto = { id: string; nome: string; pontos_por_real: number };
type Premio = {
  id: string;
  nome: string;
  custo: number | null;
  pontos_necessarios: number;
  exclusivo_premium: boolean;
  ativo: boolean;
  posto_id: string;
  postos: { nome: string } | null;
};

const premioSchema = z.object({
  nome: z.string().trim().min(1, "O nome é obrigatório"),
  posto_id: z.string().uuid("Selecione um posto"),
  custo: z.coerce.number().positive("O custo deve ser maior que zero"),
  percentual: z.coerce
    .number()
    .positive("O percentual deve ser maior que zero")
    .max(1, "O percentual não pode passar de 100%"),
  pontos_necessarios: z.coerce
    .number()
    .int("Deve ser um número inteiro")
    .positive("Deve ser maior que zero"),
  exclusivo_premium: z.boolean(),
});

type PremioFormData = z.infer<typeof premioSchema>;

const PERCENTUAL_PADRAO = 0.01;

function calcularPontos(custo: number, percentual: number, pontosPorReal: number) {
  if (!custo || !percentual || custo <= 0 || percentual <= 0) {
    return { gastoNecessario: 0, pontosNecessarios: 0 };
  }
  const gastoNecessario = custo / percentual;
  const pontosNecessarios = Math.round(gastoNecessario * pontosPorReal);
  return { gastoNecessario, pontosNecessarios };
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AdminPremios() {
  const queryClient = useQueryClient();
  const [postoFilter, setPostoFilter] = useState<string>("all");
  const [editingPremio, setEditingPremio] = useState<Premio | null>(null);

  const { data: postos } = useQuery({
    queryKey: ["postos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("postos")
        .select("id, nome, pontos_por_real")
        .order("nome");
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

  const saveMutation = useMutation({
    mutationFn: async (formData: PremioFormData) => {
      const payload = {
        nome: formData.nome,
        posto_id: formData.posto_id,
        custo: formData.custo,
        pontos_necessarios: formData.pontos_necessarios,
        exclusivo_premium: formData.exclusivo_premium,
      };
      if (editingPremio) {
        const { error } = await supabase.from("premios").update(payload).eq("id", editingPremio.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("premios").insert([{ ...payload, ativo: true }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPremio ? "Prêmio atualizado!" : "Prêmio cadastrado!");
      queryClient.invalidateQueries({ queryKey: ["premios"] });
      setEditingPremio(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async (premio: Premio) => {
      const { error } = await supabase
        .from("premios")
        .update({ ativo: !premio.ativo })
        .eq("id", premio.id);
      if (error) throw error;
    },
    onSuccess: (_data, premio) => {
      toast.success(premio.ativo ? "Prêmio desativado." : "Prêmio reativado.");
      queryClient.invalidateQueries({ queryKey: ["premios"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  function handleEditarPremio(premio: Premio) {
    setEditingPremio(premio);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDesativar(premio: Premio) {
    const acao = premio.ativo ? "desativar" : "reativar";
    if (confirm(`Tem certeza que deseja ${acao} este prêmio?`)) {
      toggleAtivoMutation.mutate(premio);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" /> Prêmios
        </h1>
        <p className="text-sm text-muted-foreground">
          Calcule o custo em pontos de um prêmio e gerencie o catálogo por posto.
        </p>
      </div>

      <CalculadoraPontos
        key={editingPremio?.id ?? "new"}
        postos={postos ?? []}
        editing={editingPremio}
        onSave={(data) => saveMutation.mutate(data)}
        onCancelEdit={() => setEditingPremio(null)}
        isSaving={saveMutation.isPending}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground">Prêmios cadastrados</h2>
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
      </div>

      <div className="glass-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !premiosFiltrados.length ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            {postoFilter === "all"
              ? "Nenhum prêmio cadastrado. Use a calculadora acima para cadastrar o primeiro."
              : "Este posto ainda não tem prêmios cadastrados."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-white/5 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Posto</th>
                  <th className="px-6 py-4 font-semibold">Prêmio</th>
                  <th className="px-6 py-4 font-semibold">Custo</th>
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
                    <td className="px-6 py-4 text-muted-foreground">
                      {premio.custo != null ? formatBRL(premio.custo) : "—"}
                    </td>
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
                          className={`h-8 w-8 ${premio.ativo ? "text-red-400 hover:text-red-300 hover:bg-red-400/10" : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"}`}
                          onClick={() => handleDesativar(premio)}
                          title={premio.ativo ? "Desativar" : "Reativar"}
                        >
                          <Power className="w-4 h-4" />
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
    </div>
  );
}

function CalculadoraPontos({
  postos,
  editing,
  onSave,
  onCancelEdit,
  isSaving,
}: {
  postos: Posto[];
  editing: Premio | null;
  onSave: (d: PremioFormData) => void;
  onCancelEdit: () => void;
  isSaving: boolean;
}) {
  const [nome, setNome] = useState(editing?.nome ?? "");
  const [postoId, setPostoId] = useState(editing?.posto_id ?? "");
  const [custo, setCusto] = useState<string>(editing?.custo != null ? String(editing.custo) : "");
  const [percentual, setPercentual] = useState(PERCENTUAL_PADRAO);
  const [exclusivoPremium, setExclusivoPremium] = useState(editing?.exclusivo_premium ?? false);
  const [avancadoAberto, setAvancadoAberto] = useState(false);

  const [pontosOverride, setPontosOverride] = useState<number | null>(
    editing?.pontos_necessarios ?? null,
  );

  const postoSelecionado = postos.find((p) => p.id === postoId);
  const custoNum = Number(custo.replace(",", "."));
  const { gastoNecessario, pontosNecessarios } = calcularPontos(
    custoNum,
    percentual,
    postoSelecionado?.pontos_por_real ?? 1,
  );

  const pontosExibidos = pontosOverride ?? pontosNecessarios;

  // Qualquer alteração nos insumos do cálculo descarta um ajuste manual
  // anterior do admin, voltando a mostrar o valor recalculado.
  function handleCustoChange(value: string) {
    setCusto(value);
    setPontosOverride(null);
  }

  function handlePercentualChange(value: number) {
    setPercentual(value);
    setPontosOverride(null);
  }

  function handlePostoChange(value: string) {
    setPostoId(value);
    setPontosOverride(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = premioSchema.safeParse({
      nome,
      posto_id: postoId,
      custo: custoNum,
      percentual,
      pontos_necessarios: pontosExibidos,
      exclusivo_premium: exclusivoPremium,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    onSave(parsed.data);
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="w-5 h-5 text-primary" />
            {editing ? "Editar prêmio" : "Calculadora de Pontos"}
          </CardTitle>
          <CardDescription>
            O cliente precisa gastar 100x o custo do produto (1%) antes de poder resgatá-lo.
          </CardDescription>
        </div>
        {editing && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" /> Cancelar edição
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Posto</label>
              <Select value={postoId} onValueChange={handlePostoChange}>
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
              {postoSelecionado && (
                <p className="text-xs text-muted-foreground mt-1">
                  {Number(postoSelecionado.pontos_por_real).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}{" "}
                  ponto(s) por R$1,00 gasto neste posto.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome do Produto</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Cerveja lata 350ml"
                className="bg-white/5 border-input focus-visible:ring-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Custo do Produto (R$)</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={custo}
                onChange={(e) => handleCustoChange(e.target.value)}
                placeholder="Ex: 2,50"
                className="bg-white/5 border-input focus-visible:ring-primary"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Custo real de aquisição pelo posto — nunca o preço de venda.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border p-3 bg-white/5">
              <Checkbox
                id="exclusivo_premium"
                checked={exclusivoPremium}
                onCheckedChange={(checked) => setExclusivoPremium(checked === true)}
              />
              <Label htmlFor="exclusivo_premium" className="cursor-pointer">
                <span className="text-sm font-medium">Exclusivo Premium</span>
                <p className="text-xs text-muted-foreground font-normal">
                  Só fica visível para assinantes Abastece+ Pro.
                </p>
              </Label>
            </div>

            <Collapsible open={avancadoAberto} onOpenChange={setAvancadoAberto}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground -ml-2">
                  <ChevronsUpDown className="w-3.5 h-3.5 mr-1.5" /> Avançado
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Percentual sobre o custo (%)
                </label>
                <Input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={percentual * 100}
                  onChange={(e) => handlePercentualChange((Number(e.target.value) || 0) / 100)}
                  className="bg-white/5 border-input focus-visible:ring-primary max-w-[160px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Padrão: 1%. Ajuste apenas se a régua de precificação mudar.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-border bg-white/5 p-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pontos necessários
              </p>
              <Input
                type="number"
                min="1"
                step="1"
                value={pontosExibidos || ""}
                onChange={(e) => setPontosOverride(Number(e.target.value) || 0)}
                className="text-center text-3xl font-bold h-16 bg-white/5 border-input text-emerald-400 focus-visible:ring-primary"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Equivale a {formatBRL(gastoNecessario)} em abastecimento
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSaving || !postoId || !custoNum}
              className="mt-6 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editing ? (
                "Salvar Alterações"
              ) : (
                "Salvar Prêmio"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
