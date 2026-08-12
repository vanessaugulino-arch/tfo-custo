export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export const REGIME_LABELS: Record<string, string> = {
  simples_nacional: "Simples Nacional (sem crédito)",
  lucro_presumido_real: "Lucro Presumido/Real (crédito hoje)",
  iva_dual_2027: "IVA Dual 2027 (CBS/IBS)",
};

export const MODELO_PRECIFICACAO_LABELS: Record<string, string> = {
  colecao: "Por coleção",
  peca_desenvolvida: "Por peça desenvolvida",
  peca_produzida: "Por peça produzida",
  tempo: "Por tempo",
};

export const MODELO_PRECIFICACAO_EXPLICACAO: Record<string, string> = {
  colecao:
    "O valor combinado com o fornecedor é dividido entre todas as peças da coleção. O custo por peça só fica definitivo quando você 'fecha' a coleção.",
  peca_desenvolvida:
    "O valor cobrado (ex: taxa de modelagem) é dividido apenas entre as peças que usaram esse serviço nesta coleção. O custo por peça é provisório até você 'fechar' a coleção — pode cair se mais peças usarem o mesmo serviço.",
  peca_produzida:
    "O valor é cobrado integralmente por peça produzida (ex: costura por unidade). Não é dividido — cada peça carrega o custo completo.",
  tempo: "O valor é calculado pelo tempo gasto (minutos) multiplicado pelo custo por minuto do fornecedor.",
};

export const MOVIMENTO_LABELS: Record<string, string> = {
  entrada_compra: "Entrada (compra)",
  saida_aprovacao: "Saída (aprovação de produto)",
  ajuste_manual: "Ajuste manual",
  ajuste_inventario: "Ajuste de inventário",
  saida_beneficiamento: "Saída (beneficiamento)",
  entrada_beneficiamento: "Entrada (beneficiamento)",
};

export const UNIDADE_COMPRA_LABELS: Record<string, string> = {
  metro: "Metro",
  peso_kg: "Peso (kg)",
  rolo: "Rolo",
  peca: "Peça",
};

/**
 * Estimativa inicial de encargos trabalhistas (CLT) sobre o salário base, por regime tributário —
 * ponto de partida editável por cargo, não um valor exato (varia por CNAE, RAT/FAP, acordos coletivos).
 * Simples Nacional: FGTS 8% + provisão 13º ~8,33% + provisão férias+1/3 ~11,11% + multa rescisória FGTS ~4%, sem INSS patronal.
 * Lucro Presumido/Real: os mesmos itens + INSS patronal 20% + RAT/FAP (~1-3%) + Sistema S (~5,8%).
 * IVA Dual (2027): a reforma tributária não altera encargos trabalhistas — mantém a mesma base do regime de renda equivalente.
 */
export const ENCARGOS_SUGERIDOS: Record<string, number> = {
  simples_nacional: 32,
  lucro_presumido_real: 68,
  iva_dual_2027: 68,
};

export const MODELO_PRODUCAO_LABELS: Record<string, string> = {
  propria: "Produção própria",
  terceirizada: "Terceirizo a produção",
  misto: "Misto",
};

export const UNIDADE_COMPRA_SUFIXO: Record<string, string> = {
  metro: "m",
  peso_kg: "kg",
  rolo: "rolo(s)",
  peca: "pack(s)",
};
