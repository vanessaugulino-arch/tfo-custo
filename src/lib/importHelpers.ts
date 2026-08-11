import { supabase } from "./supabase";

async function findOrCreate(table: "fornecedores" | "materiais" | "servicos" | "categorias_produto", nome: string): Promise<string> {
  const nomeLimpo = nome.trim();
  const { data: existente, error: erroBusca } = await supabase
    .from(table)
    .select("id")
    .ilike("nome", nomeLimpo)
    .maybeSingle();
  if (erroBusca) throw erroBusca;
  if (existente) return existente.id;

  const { data: criado, error: erroCriar } = await supabase.from(table).insert({ nome: nomeLimpo }).select("id").single();
  if (erroCriar) throw erroCriar;
  return criado.id;
}

export const findOrCreateFornecedor = (nome: string) => findOrCreate("fornecedores", nome);
export const findOrCreateMaterial = (nome: string) => findOrCreate("materiais", nome);
export const findOrCreateServico = (nome: string) => findOrCreate("servicos", nome);
export const findOrCreateCategoria = (nome: string) => findOrCreate("categorias_produto", nome);

/** Converte "R$ 350,00", "350.00" ou "350" em number. Retorna NaN se vazio/ilegível. */
export function parseNumeroPtBr(valor: string | undefined): number {
  if (!valor) return NaN;
  const limpo = valor.replace(/[R$\s]/g, "").replace(/\.(?=\d{3},)/g, "").replace(",", ".");
  return parseFloat(limpo);
}
