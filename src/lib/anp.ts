import * as XLSX from "xlsx";

export type CombustivelTipo = "etanol" | "gasolina_comum" | "gasolina_aditivada" | "diesel";

export type AnpPosto = {
  cnpj: string; // 14 dígitos, sem pontuação
  cnpjFormatado: string; // 00.000.000/0000-00
  razaoSocial: string;
  fantasia: string;
  endereco: string;
  municipio: string;
  precos: Partial<Record<CombustivelTipo, number>>;
};

export type AnpParseResult = {
  header: string[];
  postos: AnpPosto[];
};

// A ANP não garante nomes de coluna estáveis entre semanas — por isso a busca é por
// palavra-chave (contém), não por nome exato nem por posição fixa.
const REQUIRED_KEYWORDS: Record<string, string[]> = {
  cnpj: ["CNPJ"],
  municipio: ["MUNICIP"],
  razaoSocial: ["RAZ", "REVENDA", "EMPRESA"],
  endereco: ["ENDERE"],
  produto: ["PRODUTO"],
  valor: ["PRECO", "PRECO DE REVENDA", "VALOR"],
};

const OPTIONAL_KEYWORDS: Record<string, string[]> = {
  fantasia: ["FANTASIA"],
  numero: ["NUMERO", "N."],
  bairro: ["BAIRRO"],
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function up(s: unknown): string {
  return stripAccents(String(s ?? "")).toUpperCase().trim();
}

function findColumnIndex(header: string[], keywords: string[]): number {
  return header.findIndex((h) => {
    const hu = up(h);
    return keywords.some((k) => hu.includes(up(k)));
  });
}

function findHeaderRowIndex(rows: unknown[][]): number {
  const limit = Math.min(rows.length, 30);
  for (let i = 0; i < limit; i++) {
    const rowU = rows[i].map(up);
    if (rowU.some((c) => c.includes("CNPJ")) && rowU.some((c) => c.includes("MUNICIP"))) {
      return i;
    }
  }
  return -1;
}

function normalizeCnpj(raw: unknown): { digits: string; formatted: string } | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const digits = String(Math.round(n)).padStart(14, "0").slice(-14);
  const formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  return { digits, formatted };
}

function mapProduto(produto: string): CombustivelTipo | null {
  const p = up(produto);
  if (p.includes("ETANOL")) return "etanol";
  if (p.includes("GASOLINA") && p.includes("ADITIV")) return "gasolina_aditivada";
  if (p.includes("GASOLINA")) return "gasolina_comum";
  if (p.includes("DIESEL")) return "diesel";
  return null;
}

/**
 * Faz o parsing da planilha semanal da ANP e retorna só os postos de Votuporanga,
 * já agrupados por CNPJ (a planilha tem uma linha por posto+combustível).
 */
export function parseAnpVotuporanga(bytes: ArrayBuffer): AnpParseResult {
  const wb = XLSX.read(bytes, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Duas leituras da mesma planilha: `raw:false` dá o texto formatado (bom pra tudo,
  // exceto CNPJ — o formato numérico customizado da ANP quebra o texto do CNPJ e corta
  // os zeros à esquerda). `raw:true` dá o valor numérico bruto, que é o certo pro CNPJ.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" });
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });

  const headerRowIdx = findHeaderRowIndex(rows);
  if (headerRowIdx === -1) {
    console.error("[ANP] Não encontrei a linha de cabeçalho. Primeiras linhas da planilha:", rows.slice(0, 15));
    throw new Error(
      "Não encontrei a linha de cabeçalho da planilha da ANP (esperava colunas com CNPJ e MUNICÍPIO). Veja o console do navegador para o conteúdo real.",
    );
  }
  const header = rows[headerRowIdx].map((h) => String(h));
  console.log("[ANP] Cabeçalho real da planilha:", header);

  const cols = {
    cnpj: findColumnIndex(header, REQUIRED_KEYWORDS.cnpj),
    municipio: findColumnIndex(header, REQUIRED_KEYWORDS.municipio),
    razaoSocial: findColumnIndex(header, REQUIRED_KEYWORDS.razaoSocial),
    endereco: findColumnIndex(header, REQUIRED_KEYWORDS.endereco),
    produto: findColumnIndex(header, REQUIRED_KEYWORDS.produto),
    valor: findColumnIndex(header, REQUIRED_KEYWORDS.valor),
    fantasia: findColumnIndex(header, OPTIONAL_KEYWORDS.fantasia),
    numero: findColumnIndex(header, OPTIONAL_KEYWORDS.numero),
    bairro: findColumnIndex(header, OPTIONAL_KEYWORDS.bairro),
  };

  const missing = (["cnpj", "municipio", "razaoSocial", "endereco", "produto", "valor"] as const).filter(
    (k) => cols[k] === -1,
  );
  if (missing.length > 0) {
    throw new Error(
      `A planilha da ANP mudou de formato: não encontrei a(s) coluna(s) ${missing.join(", ")}. Cabeçalho encontrado: ${header.join(" | ")}`,
    );
  }

  const dataRows = rows.slice(headerRowIdx + 1);
  const rawDataRows = rawRows.slice(headerRowIdx + 1);

  const grouped = new Map<string, AnpPosto>();
  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    if (!row || row.every((c) => c === "")) continue;
    if (up(row[cols.municipio]) !== "VOTUPORANGA") continue;

    const cnpjInfo = normalizeCnpj(rawDataRows[r]?.[cols.cnpj]);
    if (!cnpjInfo) continue;

    if (!grouped.has(cnpjInfo.digits)) {
      const enderecoPartes = [
        String(row[cols.endereco] ?? "").trim(),
        cols.numero >= 0 ? String(row[cols.numero] ?? "").trim() : "",
        cols.bairro >= 0 ? String(row[cols.bairro] ?? "").trim() : "",
      ].filter(Boolean);
      grouped.set(cnpjInfo.digits, {
        cnpj: cnpjInfo.digits,
        cnpjFormatado: cnpjInfo.formatted,
        razaoSocial: String(row[cols.razaoSocial] ?? "").trim(),
        fantasia: cols.fantasia >= 0 ? String(row[cols.fantasia] ?? "").trim() : "",
        endereco: enderecoPartes.join(", "),
        municipio: String(row[cols.municipio] ?? "").trim(),
        precos: {},
      });
    }

    const combustivel = mapProduto(String(row[cols.produto]));
    const valor = Number(String(row[cols.valor]).replace(",", "."));
    if (!combustivel || isNaN(valor)) continue;

    const posto = grouped.get(cnpjInfo.digits)!;
    if (combustivel === "diesel") {
      // Quando existem DIESEL S10 e S500 pro mesmo posto, prioriza o S10 (mais comum).
      const isS10 = up(row[cols.produto]).includes("S10");
      if (posto.precos.diesel === undefined || isS10) posto.precos.diesel = valor;
    } else {
      posto.precos[combustivel] = valor;
    }
  }

  return { header, postos: [...grouped.values()] };
}

function tokenize(s: string): Set<string> {
  return new Set(up(s).split(/[^A-Z0-9]+/).filter((w) => w.length > 2));
}

/**
 * Score simples de similaridade por palavras em comum entre o posto da ANP e um
 * posto do nosso banco — usado só pra pré-selecionar uma sugestão na Fase 1 (conciliação
 * manual). Não precisa ser sofisticado: Douglas confirma ou corrige cada linha.
 */
export function similarityScore(
  anp: Pick<AnpPosto, "razaoSocial" | "fantasia" | "endereco">,
  nosso: { nome: string; endereco: string },
): number {
  const a = new Set([...tokenize(anp.razaoSocial), ...tokenize(anp.fantasia), ...tokenize(anp.endereco)]);
  const b = new Set([...tokenize(nosso.nome), ...tokenize(nosso.endereco)]);
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const w of a) if (b.has(w)) common++;
  return common / Math.max(a.size, b.size);
}

export const LABELS_COMBUSTIVEL: Record<CombustivelTipo, string> = {
  etanol: "Etanol",
  gasolina_comum: "Gasolina Comum",
  gasolina_aditivada: "Gasolina Aditivada",
  diesel: "Diesel",
};
