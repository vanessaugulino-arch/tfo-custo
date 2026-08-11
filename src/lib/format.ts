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
  peca: "Por peça desenvolvida",
  tempo: "Por tempo",
  produto: "Por produto produzido",
};

export const MOVIMENTO_LABELS: Record<string, string> = {
  entrada_compra: "Entrada (compra)",
  saida_aprovacao: "Saída (aprovação de produto)",
  ajuste_manual: "Ajuste manual",
  ajuste_inventario: "Ajuste de inventário",
};
