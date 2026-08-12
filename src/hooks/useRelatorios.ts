import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Todo o histórico de movimentos de estoque, sem limite — usado para relatórios (estoque parado, consumo médio). */
export function useTodosMovimentos() {
  return useQuery({
    queryKey: ["relatorio_movimentos_todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentos_estoque")
        .select("material_id, tipo, quantidade, criado_em")
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export interface ProdutoServicoRelatorio {
  produto_id: string;
  servico_fornecedor_id: string;
  preco_unitario: number | null;
  tempo_minutos: number | null;
  custo_por_minuto_aplicado: number | null;
  valor_calculado: number | null;
}

/** Todas as linhas de serviço lançadas em produtos — usada para preço médio por tipo de serviço e comparação interno x terceiros. */
export function useProdutoServicosTodos() {
  return useQuery({
    queryKey: ["relatorio_produto_servicos"],
    queryFn: async (): Promise<ProdutoServicoRelatorio[]> => {
      const { data, error } = await supabase
        .from("produto_servicos")
        .select("produto_id, servico_fornecedor_id, preco_unitario, tempo_minutos, custo_por_minuto_aplicado, valor_calculado");
      if (error) throw error;
      return data;
    },
  });
}

export interface ServicoFornecedorCategoriaRelatorio {
  servico_fornecedor_id: string;
  categoria_produto_id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
}

/** Quais fornecedores atendem quais categorias de produto, via os serviços que cadastraram. */
export function useFornecedoresPorCategoriaTodos() {
  return useQuery({
    queryKey: ["relatorio_fornecedores_categoria"],
    queryFn: async (): Promise<ServicoFornecedorCategoriaRelatorio[]> => {
      const { data, error } = await supabase
        .from("servico_fornecedor_categoria")
        .select("servico_fornecedor_id, categoria_produto_id, servico_fornecedor:servico_fornecedor(fornecedor_id, fornecedor:fornecedores(nome))");
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        servico_fornecedor_id: row.servico_fornecedor_id,
        categoria_produto_id: row.categoria_produto_id,
        fornecedor_id: row.servico_fornecedor?.fornecedor_id,
        fornecedor_nome: row.servico_fornecedor?.fornecedor?.nome ?? "",
      }));
    },
  });
}
