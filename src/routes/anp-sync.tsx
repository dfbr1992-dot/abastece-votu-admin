import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Search, Save, ExternalLink, CheckCircle2 } from "lucide-react";
import { parseAnpVotuporanga, similarityScore, LABELS_COMBUSTIVEL, type AnpPosto } from "@/lib/anp";

export const Route = createFileRoute("/anp-sync")({ component: AnpSyncPage });

const ANP_LISTING_URL =
  "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas";

const MATCH_SUGGESTION_THRESHOLD = 0.2;
const NONE_VALUE = "__none__";

type Posto = { id: string; nome: string; endereco: string; cnpj: string | null };

function AnpSyncPage() {
  const qc = useQueryClient();
  const { data: postos, isLoading: loadingPostos } = useQuery({
    queryKey: ["postos-cnpj"],
    queryFn: async () => {
      const { data, error } = await supabase.from("postos").select("id, nome, endereco, cnpj").order("nome");
      if (error) throw error;
      return data as Posto[];
    },
  });

  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [anpPostos, setAnpPostos] = useState<AnpPosto[] | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});

  async function buscarDadosAnp() {
    if (!postos) return;
    setBuscando(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await fetch(`${SUPABASE_URL}/functions/v1/anp-proxy`, {
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLISHABLE_KEY },
      });

      if (!res.ok) {
        let msg = `Falha ao buscar a planilha da ANP (status ${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          // resposta não era JSON, mantém a mensagem genérica
        }
        throw new Error(msg);
      }

      const nomeArquivo = res.headers.get("X-Anp-File-Name") ?? "planilha-anp.xlsx";
      const bytes = await res.arrayBuffer();
      const resultado = parseAnpVotuporanga(bytes);

      const sugestoes: Record<string, string> = {};
      for (const anp of resultado.postos) {
        let melhor: { id: string; score: number } | null = null;
        for (const p of postos) {
          const score = similarityScore(anp, p);
          if (!melhor || score > melhor.score) melhor = { id: p.id, score };
        }
        sugestoes[anp.cnpj] = melhor && melhor.score >= MATCH_SUGGESTION_THRESHOLD ? melhor.id : NONE_VALUE;
      }

      setAnpPostos(resultado.postos);
      setMatches(sugestoes);
      setFileName(nomeArquivo);
      toast.success(`${resultado.postos.length} posto(s) de Votuporanga encontrados em ${nomeArquivo}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao buscar dados da ANP");
    } finally {
      setBuscando(false);
    }
  }

  async function salvarCnpjs() {
    if (!anpPostos) return;
    const paraSalvar = anpPostos.filter((anp) => matches[anp.cnpj] && matches[anp.cnpj] !== NONE_VALUE);
    if (paraSalvar.length === 0) {
      toast.error("Nenhuma correspondência confirmada para salvar");
      return;
    }

    setSalvando(true);
    let ok = 0;
    let falhas = 0;
    for (const anp of paraSalvar) {
      const postoId = matches[anp.cnpj];
      const { error } = await supabase.from("postos").update({ cnpj: anp.cnpj }).eq("id", postoId);
      if (error) falhas++;
      else ok++;
    }
    setSalvando(false);

    if (ok > 0) toast.success(`${ok} CNPJ(s) salvo(s)`);
    if (falhas > 0) toast.error(`${falhas} falharam ao salvar`);
    qc.invalidateQueries({ queryKey: ["postos-cnpj"] });
    qc.invalidateQueries({ queryKey: ["postos"] });
  }

  const naoEncontrados = (postos ?? []).length - new Set(Object.values(matches).filter((v) => v !== NONE_VALUE)).size;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-foreground md:text-3xl">Sincronização ANP</h1>
          <p className="text-muted-foreground">
            Concilie os postos de Votuporanga da planilha semanal da ANP com o nosso cadastro, uma única vez, pra
            habilitar a atualização automática de preços.
          </p>
        </div>
        <a
          href={ANP_LISTING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Ver página da ANP
        </a>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-border mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">1. Buscar a planilha mais recente</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fileName ? `Última busca: ${fileName}` : "Baixa e filtra automaticamente só os postos de Votuporanga."}
          </p>
        </div>
        <Button onClick={buscarDadosAnp} disabled={buscando || loadingPostos}>
          {buscando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          Buscar dados da ANP
        </Button>
      </div>

      {anpPostos && (
        <>
          <div className="glass-card overflow-hidden rounded-2xl border border-border mb-6">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Posto (ANP)</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Combustíveis</th>
                  <th className="px-4 py-3 font-medium">Corresponde ao posto</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">CNPJ atual</th>
                </tr>
              </thead>
              <tbody>
                {anpPostos.map((anp) => {
                  const postoSelecionado = postos?.find((p) => p.id === matches[anp.cnpj]);
                  return (
                    <tr key={anp.cnpj} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{anp.fantasia || anp.razaoSocial}</div>
                        <div className="text-xs text-muted-foreground">{anp.endereco}</div>
                        <div className="text-xs text-muted-foreground/70 mt-0.5">{anp.cnpjFormatado}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(Object.keys(anp.precos) as (keyof typeof anp.precos)[]).map((k) => (
                            <span
                              key={k}
                              className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            >
                              {LABELS_COMBUSTIVEL[k]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={matches[anp.cnpj] ?? NONE_VALUE}
                          onValueChange={(v) => setMatches((prev) => ({ ...prev, [anp.cnpj]: v }))}
                        >
                          <SelectTrigger className="bg-white/5 border-input text-white h-9 w-full min-w-[220px] focus-visible:ring-ring">
                            <SelectValue placeholder="Selecione um posto" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover text-popover-foreground border-border">
                            <SelectItem value={NONE_VALUE} className="focus:bg-white/10 text-muted-foreground">
                              — Nenhum —
                            </SelectItem>
                            {postos?.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="focus:bg-white/10">
                                {p.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {postoSelecionado?.cnpj ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {postoSelecionado.cnpj}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-xs text-muted-foreground">
              {naoEncontrados > 0
                ? `${naoEncontrados} posto(s) do nosso cadastro não apareceram nessa planilha ou ficarão sem CNPJ até serem confirmados.`
                : "Todos os postos do cadastro têm uma correspondência confirmada."}
            </p>
            <Button onClick={salvarCnpjs} disabled={salvando}>
              {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar CNPJs
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
