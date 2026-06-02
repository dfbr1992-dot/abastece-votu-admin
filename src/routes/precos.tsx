import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { ChevronRight, Fuel, Loader2 } from "lucide-react";

export const Route = createFileRoute("/precos")({ component: PrecosPage });

type Combustivel = "etanol" | "gasolina_comum" | "gasolina_aditivada" | "diesel";
type Preco = { combustivel: Combustivel; valor: number };
type Posto = { id: string; nome: string; ativo: boolean; precos: Preco[] };

const LABELS: Record<Combustivel, string> = {
  etanol: "Etanol",
  gasolina_comum: "Gasolina Comum",
  gasolina_aditivada: "Gasolina Aditivada",
  diesel: "Diesel",
};

function PrecosPage() {
  const { data: postos, isLoading } = useQuery({
    queryKey: ["postos-com-precos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("postos")
        .select("id, nome, ativo, precos(combustivel, valor)")
        .order("nome");
      if (error) throw error;
      return data as Posto[];
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">Motor de Preços</h1>
      <p className="text-muted-foreground mb-6">Atualize os valores em tempo real. As mudanças sincronizam imediatamente.</p>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando…</div>
      ) : !postos?.length ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">
          Cadastre postos primeiro para gerenciar os preços.
        </div>
      ) : (
        <div className="space-y-3">
          {postos.map((p) => <PostoRow key={p.id} posto={p} />)}
        </div>
      )}
    </div>
  );
}

function PostoRow({ posto }: { posto: Posto }) {
  const [open, setOpen] = useState(false);
  const precoMap = Object.fromEntries(posto.precos.map((p) => [p.combustivel, p.valor]));

  return (
    <>
      {/* Botão solto, sem o SheetTrigger ao redor */}
      <button 
        onClick={() => setOpen(true)}
        className="glass-card bg-white/5 border border-white/10 flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-shadow hover:bg-white/10"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
          <Fuel className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate font-semibold text-white">{posto.nome}</div>
          <div className="text-xs text-muted-foreground flex gap-3 flex-wrap mt-1">
            {(["etanol", "gasolina_comum", "diesel"] as const).map((k) =>
              precoMap[k] ? <span key={k}>{LABELS[k].split(" ")[0]} <b className="text-emerald-400">R$ {Number(precoMap[k]).toFixed(2)}</b></span> : null
            )}
            {posto.precos.length === 0 && <span>Sem preços cadastrados</span>}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* O Sheet escuta apenas a variável open */}
      <Sheet open={open} onOpenChange={setOpen}>
        <PrecosSheet postoId={posto.id} postoNome={posto.nome} initial={precoMap} onSaved={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

function PrecosSheet({ postoId, postoNome, initial, onSaved }: { postoId: string; postoNome: string; initial: Record<string, number>; onSaved: () => void }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<Combustivel, string>>({
    etanol: initial.etanol?.toString() ?? "",
    gasolina_comum: initial.gasolina_comum?.toString() ?? "",
    gasolina_aditivada: initial.gasolina_aditivada?.toString() ?? "",
    diesel: initial.diesel?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const rows = (Object.entries(values) as [Combustivel, string][])
      .filter(([, v]) => v.trim() !== "")
      .map(([combustivel, v]) => {
        const num = Number(v.replace(",", "."));
        return { posto_id: postoId, combustivel, valor: num };
      });

    const invalid = rows.find((r) => isNaN(r.valor) || r.valor <= 0 || r.valor > 99);
    if (invalid) { toast.error("Valor inválido"); setSaving(false); return; }

    if (rows.length === 0) { toast.error("Informe ao menos um preço"); setSaving(false); return; }

    const { error } = await supabase.from("precos").upsert(rows, { onConflict: "posto_id,combustivel" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Preços atualizados");
    qc.invalidateQueries({ queryKey: ["postos-com-precos"] });
    qc.invalidateQueries({ queryKey: ["count", "precos"] });
    onSaved();
  }

  return (
    /* Cor de fundo e borda forçadas no SheetContent para o tema escuro */
    <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto bg-[#0B0F19] text-white border-t border-white/10 rounded-t-2xl">
      <SheetHeader>
        <SheetTitle className="text-white text-xl">{postoNome}</SheetTitle>
      </SheetHeader>
      
      <div className="space-y-5 py-6">
        {(Object.keys(LABELS) as Combustivel[]).map((k) => (
          <div key={k} className="space-y-2">
            <Label className="text-gray-300">{LABELS[k]}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                placeholder="0.000"
                className="pl-10 h-12 text-lg bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-blue-500"
                value={values[k]}
                onChange={(e) => setValues({ ...values, [k]: e.target.value })}
              />
            </div>
          </div>
        ))}
        <Button onClick={save} disabled={saving} className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white mt-4">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Salvar preços
        </Button>
      </div>
    </SheetContent>
  );
}