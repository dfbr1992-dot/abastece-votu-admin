// Sincronização semanal de preços via ANP.
//
// Roda como GitHub Action (não como Supabase Edge Function): a planilha da ANP é
// nacional, não só de Votuporanga, e processá-la (parsing + filtro) dentro de uma
// Edge Function já estourou o limite de recursos do Supabase (WORKER_RESOURCE_LIMIT).
// Aqui, no runner do GitHub Actions, sobra recurso — e só o resultado já filtrado
// (só Votuporanga, ~22 linhas) é que vai pro Supabase.
//
// A lógica de parsing/normalização abaixo espelha `src/lib/anp.ts` (usado pela tela
// de conciliação /anp-sync no admin). Se a ANP mudar o formato da planilha, ajuste os
// dois lugares.

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltam as variáveis de ambiente SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const LISTING_URL =
  "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const REQUIRED_KEYWORDS = {
  cnpj: ["CNPJ"],
  municipio: ["MUNICIP"],
  razaoSocial: ["RAZ", "REVENDA", "EMPRESA"],
  endereco: ["ENDERE"],
  produto: ["PRODUTO"],
  valor: ["PRECO", "PRECO DE REVENDA", "VALOR"],
};
const OPTIONAL_KEYWORDS = {
  numero: ["NUMERO", "N."],
  bairro: ["BAIRRO"],
};

function stripAccents(s) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function up(s) {
  return stripAccents(String(s ?? "")).toUpperCase().trim();
}
function findColumnIndex(header, keywords) {
  return header.findIndex((h) => {
    const hu = up(h);
    return keywords.some((k) => hu.includes(up(k)));
  });
}
function findHeaderRowIndex(rows) {
  const limit = Math.min(rows.length, 30);
  for (let i = 0; i < limit; i++) {
    const rowU = rows[i].map(up);
    if (rowU.some((c) => c.includes("CNPJ")) && rowU.some((c) => c.includes("MUNICIP"))) return i;
  }
  return -1;
}
function normalizeCnpj(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(Math.round(n)).padStart(14, "0").slice(-14);
}
function mapProduto(produto) {
  const p = up(produto);
  if (p.includes("ETANOL")) return "etanol";
  if (p.includes("GASOLINA") && p.includes("ADITIV")) return "gasolina_aditivada";
  if (p.includes("GASOLINA")) return "gasolina_comum";
  if (p.includes("DIESEL")) return "diesel";
  return null;
}

async function encontrarUrlPlanilhaMaisRecente() {
  const res = await fetch(LISTING_URL, { headers: { "User-Agent": BROWSER_UA } });
  if (!res.ok) throw new Error(`Falha ao abrir a página da ANP (status ${res.status})`);
  const html = await res.text();

  // O primeiro link "revendas_lpc_*.xlsx" no HTML é sempre o mais recente (ANP lista do
  // mais novo pro mais antigo). "resumo_semanal_lpc_*" é a média por município/estado.
  const match = html.match(/href="([^"]*arquivos-lpc\/\d{4}\/revendas_lpc_[^"]*\.xlsx)"/i);
  if (!match) throw new Error("Não encontrei o link da planilha 'Preços por posto revendedor' na página da ANP.");
  return match[1];
}

function parseAnpVotuporanga(bytes) {
  const wb = XLSX.read(bytes, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // `raw:false` dá o texto formatado (bom pra tudo, exceto CNPJ — o formato numérico
  // customizado da ANP quebra o texto e corta os zeros à esquerda; ali usamos o valor
  // numérico bruto de `raw:true`).
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

  const headerRowIdx = findHeaderRowIndex(rows);
  if (headerRowIdx === -1) {
    console.error("Primeiras linhas da planilha:", rows.slice(0, 15));
    throw new Error("Não encontrei a linha de cabeçalho da planilha da ANP (esperava colunas com CNPJ e MUNICÍPIO).");
  }
  const header = rows[headerRowIdx].map((h) => String(h));
  console.log("Cabeçalho real da planilha:", header.join(" | "));

  const cols = {
    cnpj: findColumnIndex(header, REQUIRED_KEYWORDS.cnpj),
    municipio: findColumnIndex(header, REQUIRED_KEYWORDS.municipio),
    razaoSocial: findColumnIndex(header, REQUIRED_KEYWORDS.razaoSocial),
    endereco: findColumnIndex(header, REQUIRED_KEYWORDS.endereco),
    produto: findColumnIndex(header, REQUIRED_KEYWORDS.produto),
    valor: findColumnIndex(header, REQUIRED_KEYWORDS.valor),
    numero: findColumnIndex(header, OPTIONAL_KEYWORDS.numero),
    bairro: findColumnIndex(header, OPTIONAL_KEYWORDS.bairro),
  };

  const missing = ["cnpj", "municipio", "razaoSocial", "endereco", "produto", "valor"].filter((k) => cols[k] === -1);
  if (missing.length > 0) {
    throw new Error(`A planilha da ANP mudou de formato: não encontrei a(s) coluna(s) ${missing.join(", ")}. Cabeçalho: ${header.join(" | ")}`);
  }

  const dataRows = rows.slice(headerRowIdx + 1);
  const rawDataRows = rawRows.slice(headerRowIdx + 1);

  const grouped = new Map();
  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    if (!row || row.every((c) => c === "")) continue;
    if (up(row[cols.municipio]) !== "VOTUPORANGA") continue;

    const cnpj = normalizeCnpj(rawDataRows[r]?.[cols.cnpj]);
    if (!cnpj) continue;

    if (!grouped.has(cnpj)) {
      const enderecoPartes = [
        String(row[cols.endereco] ?? "").trim(),
        cols.numero >= 0 ? String(row[cols.numero] ?? "").trim() : "",
        cols.bairro >= 0 ? String(row[cols.bairro] ?? "").trim() : "",
      ].filter(Boolean);
      grouped.set(cnpj, {
        cnpj,
        razaoSocial: String(row[cols.razaoSocial] ?? "").trim(),
        endereco: enderecoPartes.join(", "),
        precos: {},
      });
    }

    const combustivel = mapProduto(String(row[cols.produto]));
    const valor = Number(String(row[cols.valor]).replace(",", "."));
    if (!combustivel || isNaN(valor)) continue;

    const posto = grouped.get(cnpj);
    if (combustivel === "diesel") {
      const isS10 = up(row[cols.produto]).includes("S10");
      if (posto.precos.diesel === undefined || isS10) posto.precos.diesel = valor;
    } else {
      posto.precos[combustivel] = valor;
    }
  }

  return [...grouped.values()];
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const fileUrl = await encontrarUrlPlanilhaMaisRecente();
  console.log(`Planilha mais recente: ${fileUrl}`);

  const fileRes = await fetch(fileUrl, { headers: { "User-Agent": BROWSER_UA } });
  if (!fileRes.ok) throw new Error(`Falha ao baixar a planilha (status ${fileRes.status})`);
  const bytes = Buffer.from(await fileRes.arrayBuffer());

  const anpPostos = parseAnpVotuporanga(bytes);
  console.log(`${anpPostos.length} posto(s) de Votuporanga encontrados na planilha.`);

  const { data: nossosPostos, error: postosError } = await supabase
    .from("postos")
    .select("id, cnpj")
    .not("cnpj", "is", null);
  if (postosError) throw new Error(`Falha ao buscar postos: ${postosError.message}`);

  const postoIdPorCnpj = new Map(nossosPostos.map((p) => [p.cnpj.replace(/\D/g, "").padStart(14, "0"), p.id]));

  const postosEncontrados = anpPostos
    .map((anp) => ({ anp, postoId: postoIdPorCnpj.get(anp.cnpj) }))
    .filter((x) => x.postoId);
  const semCorrespondencia = anpPostos.filter((anp) => !postoIdPorCnpj.get(anp.cnpj));

  const postoIds = [...new Set(postosEncontrados.map((x) => x.postoId))];
  const { data: precosAtuais, error: precosError } = await supabase
    .from("precos")
    .select("posto_id, combustivel, promo_ate")
    .in("posto_id", postoIds.length > 0 ? postoIds : ["00000000-0000-0000-0000-000000000000"]);
  if (precosError) throw new Error(`Falha ao buscar preços atuais: ${precosError.message}`);

  const promoAtePorChave = new Map(precosAtuais.map((p) => [`${p.posto_id}:${p.combustivel}`, p.promo_ate]));

  const agora = new Date();
  let atualizados = 0;
  let puladosPorPromocao = 0;
  const upserts = [];

  for (const { anp, postoId } of postosEncontrados) {
    for (const [combustivel, valor] of Object.entries(anp.precos)) {
      const promoAte = promoAtePorChave.get(`${postoId}:${combustivel}`);
      if (promoAte && new Date(promoAte) > agora) {
        puladosPorPromocao++;
        continue;
      }
      upserts.push({ posto_id: postoId, combustivel, valor, fonte: "anp", promo_ate: null, updated_at: new Date().toISOString() });
      atualizados++;
    }
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase.from("precos").upsert(upserts, { onConflict: "posto_id,combustivel" });
    if (upsertError) throw new Error(`Falha ao salvar preços: ${upsertError.message}`);
  }

  console.log("--- Resumo ---");
  console.log(`Preços atualizados: ${atualizados}`);
  console.log(`Pulados por promoção manual ativa: ${puladosPorPromocao}`);
  console.log(`Postos da planilha sem CNPJ cadastrado: ${semCorrespondencia.length}`);
  for (const anp of semCorrespondencia) {
    console.log(`  - ${anp.razaoSocial} (CNPJ ${anp.cnpj}) — ${anp.endereco}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
