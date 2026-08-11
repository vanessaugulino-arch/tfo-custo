import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];

// ---------------------------------------------------------------------------
// Perfil de negócio (onboarding)
// ---------------------------------------------------------------------------

export type PerfilNegocio = Tables["perfil_negocio"]["Row"];

export function usePerfilNegocio(userId: string | undefined) {
  return useQuery({
    queryKey: ["perfil_negocio", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PerfilNegocio | null> => {
      const { data, error } = await supabase.from("perfil_negocio").select("*").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSalvarPerfilNegocio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string } & Partial<Tables["perfil_negocio"]["Insert"]>) => {
      const { userId, ...resto } = input;
      const { data, error } = await supabase
        .from("perfil_negocio")
        .upsert({ user_id: userId, ...resto }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["perfil_negocio", variables.userId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Catálogos simples (fornecedores, materiais, categorias, serviços)
// ---------------------------------------------------------------------------

export function useFornecedores() {
  return useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from("fornecedores")
        .insert({ nome })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}

export function useMateriais() {
  return useQuery({
    queryKey: ["materiais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("materiais").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase.from("materiais").insert({ nome }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materiais"] }),
  });
}

export function useCategorias() {
  return useQuery({
    queryKey: ["categorias_produto"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias_produto").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from("categorias_produto")
        .insert({ nome })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias_produto"] }),
  });
}

export function useServicos() {
  return useQuery({
    queryKey: ["servicos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("servicos").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase.from("servicos").insert({ nome }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servicos"] }),
  });
}

// ---------------------------------------------------------------------------
// Serviço por fornecedor (modelo de precificação + categorias atendidas)
// ---------------------------------------------------------------------------

export type ServicoFornecedorCompleto = Tables["servico_fornecedor"]["Row"] & {
  fornecedor: Tables["fornecedores"]["Row"];
  servico: Tables["servicos"]["Row"];
  categorias: Tables["categorias_produto"]["Row"][];
};

export function useServicosFornecedor() {
  return useQuery({
    queryKey: ["servico_fornecedor"],
    queryFn: async (): Promise<ServicoFornecedorCompleto[]> => {
      const { data, error } = await supabase
        .from("servico_fornecedor")
        .select(
          "*, fornecedor:fornecedores(*), servico:servicos(*), servico_fornecedor_categoria(categoria:categorias_produto(*))",
        )
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        categorias: (row.servico_fornecedor_categoria ?? []).map((c: any) => c.categoria),
      }));
    },
  });
}

interface NovoServicoFornecedor {
  fornecedorId: string;
  servicoId: string;
  modeloPrecificacao: "peca" | "tempo" | "produto";
  custoPorMinuto: number | null;
  categoriaIds: string[];
}

export function useCreateServicoFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovoServicoFornecedor) => {
      const { data, error } = await supabase
        .from("servico_fornecedor")
        .insert({
          fornecedor_id: input.fornecedorId,
          servico_id: input.servicoId,
          modelo_precificacao: input.modeloPrecificacao,
          custo_por_minuto: input.custoPorMinuto,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.categoriaIds.length > 0) {
        const { error: catError } = await supabase.from("servico_fornecedor_categoria").insert(
          input.categoriaIds.map((categoria_produto_id) => ({
            servico_fornecedor_id: data.id,
            categoria_produto_id,
          })),
        );
        if (catError) throw catError;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servico_fornecedor"] }),
  });
}

// ---------------------------------------------------------------------------
// Compras de insumo
// ---------------------------------------------------------------------------

export type CompraInsumoCompleta = Tables["compras_insumo"]["Row"] & {
  fornecedor: Tables["fornecedores"]["Row"];
  material: Tables["materiais"]["Row"];
  preco_unitario_bruto: number;
  preco_unitario_liquido: number;
  quantidade_convertida: number;
};

export function useComprasInsumo() {
  return useQuery({
    queryKey: ["compras_insumo"],
    queryFn: async (): Promise<CompraInsumoCompleta[]> => {
      const { data, error } = await supabase
        .from("compras_insumo_precos")
        .select("*, fornecedor:fornecedores(*), material:materiais(*)")
        .order("data_compra", { ascending: false })
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as any;
    },
  });
}

interface NovaCompraInsumo {
  fornecedorId: string;
  materialId: string;
  packQuantidade: number;
  quantidadeComprada: number;
  precoPago: number;
  regimeTributario: string;
  aliquotaCreditoPct: number;
  dataCompra: string;
  unidadeCompra: string;
  fatorMetrosPorUnidade: number;
}

export function useCreateCompraInsumo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovaCompraInsumo) => {
      const { data, error } = await supabase
        .from("compras_insumo")
        .insert({
          fornecedor_id: input.fornecedorId,
          material_id: input.materialId,
          pack_quantidade: input.packQuantidade,
          quantidade_comprada: input.quantidadeComprada,
          preco_pago: input.precoPago,
          regime_tributario: input.regimeTributario as any,
          aliquota_credito_pct: input.aliquotaCreditoPct,
          data_compra: input.dataCompra,
          unidade_compra: input.unidadeCompra as any,
          fator_metros_por_unidade: input.fatorMetrosPorUnidade,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras_insumo"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
    },
  });
}

/** Última compra (preço vigente) por fornecedor+material — usada no wizard de produto. */
export function useUltimaCompraPorFornecedorMaterial(fornecedorId: string | null, materialId: string | null) {
  return useQuery({
    queryKey: ["ultima_compra_material", fornecedorId, materialId],
    enabled: !!fornecedorId && !!materialId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ultima_compra_material")
        .select("*")
        .eq("fornecedor_id", fornecedorId!)
        .eq("material_id", materialId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Coleções e produtos
// ---------------------------------------------------------------------------

export function useColecoes() {
  return useQuery({
    queryKey: ["colecoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colecoes")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateColecao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; periodoInicio: string | null; periodoFim: string | null }) => {
      const { data, error } = await supabase
        .from("colecoes")
        .insert({ nome: input.nome, periodo_inicio: input.periodoInicio, periodo_fim: input.periodoFim })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["colecoes"] }),
  });
}

export type ProdutoCompleto = Tables["produtos"]["Row"] & {
  categoria: Tables["categorias_produto"]["Row"] | null;
  colecao: Tables["colecoes"]["Row"] | null;
};

export function useProdutos(colecaoId?: string) {
  return useQuery({
    queryKey: ["produtos", colecaoId ?? "todos"],
    queryFn: async (): Promise<ProdutoCompleto[]> => {
      let query = supabase
        .from("produtos")
        .select("*, categoria:categorias_produto(*), colecao:colecoes(*)")
        .order("criado_em", { ascending: false });
      if (colecaoId) query = query.eq("colecao_id", colecaoId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any;
    },
  });
}

export function useAprovarProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").update({ status: "aprovado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
    },
  });
}

export function useDescartarProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").update({ status: "descartado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produtos"] }),
  });
}

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

export interface SaldoEstoque {
  material_id: string;
  material: Tables["materiais"]["Row"];
  saldo_atual: number;
}

export function useEstoqueAtual() {
  return useQuery({
    queryKey: ["estoque"],
    queryFn: async (): Promise<SaldoEstoque[]> => {
      const [{ data: materiais, error: eMat }, { data: saldos, error: eSaldo }] = await Promise.all([
        supabase.from("materiais").select("*").order("nome"),
        supabase.from("estoque_atual").select("*"),
      ]);
      if (eMat) throw eMat;
      if (eSaldo) throw eSaldo;
      const saldoPorMaterial = new Map((saldos ?? []).map((s) => [s.material_id, s.saldo_atual]));
      return (materiais ?? []).map((m) => ({
        material_id: m.id,
        material: m,
        saldo_atual: saldoPorMaterial.get(m.id) ?? 0,
      }));
    },
  });
}

export function useMovimentosEstoque(materialId?: string) {
  return useQuery({
    queryKey: ["movimentos_estoque", materialId ?? "todos"],
    queryFn: async () => {
      let query = supabase
        .from("movimentos_estoque")
        .select("*, material:materiais(*)")
        .order("criado_em", { ascending: false })
        .limit(100);
      if (materialId) query = query.eq("material_id", materialId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Sugestão de preço de serviço (último preço pago), por categoria ou geral
// ---------------------------------------------------------------------------

export function useUltimoPrecoServico(servicoFornecedorId: string | null, categoriaId: string | null) {
  return useQuery({
    queryKey: ["servico_ultimo_preco", servicoFornecedorId, categoriaId],
    enabled: !!servicoFornecedorId,
    queryFn: async () => {
      if (categoriaId) {
        const { data, error } = await supabase
          .from("servico_ultimo_preco")
          .select("*")
          .eq("servico_fornecedor_id", servicoFornecedorId!)
          .eq("categoria_produto_id", categoriaId)
          .maybeSingle();
        if (error) throw error;
        if (data) return data;
      }
      const { data, error } = await supabase
        .from("servico_ultimo_preco_geral")
        .select("*")
        .eq("servico_fornecedor_id", servicoFornecedorId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Criação completa de um produto (linhas de serviço + insumo + snapshot de custo)
// ---------------------------------------------------------------------------

export interface NovaLinhaServicoProduto {
  servicoFornecedorId: string;
  categoriaProdutoId: string | null;
  modeloPrecificacao: "peca" | "tempo" | "produto";
  precoUnitario: number | null;
  tempoMinutos: number | null;
  custoPorMinutoAplicado: number | null;
  valorCalculado: number;
}

export interface NovaLinhaInsumoProduto {
  compraInsumoId: string;
  consumoQuantidade: number;
  desperdicioPct: number;
  precoUnitarioAplicado: number;
  custoCalculado: number;
}

export interface NovoProdutoCompleto {
  nome: string;
  categoriaProdutoId: string | null;
  colecaoId: string | null;
  quantidadeProduzida: number;
  custoTotalUnitario: number;
  servicos: NovaLinhaServicoProduto[];
  insumos: NovaLinhaInsumoProduto[];
}

export function useCreateProdutoCompleto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovoProdutoCompleto) => {
      const { data: produto, error: erroProduto } = await supabase
        .from("produtos")
        .insert({
          nome: input.nome,
          categoria_produto_id: input.categoriaProdutoId,
          colecao_id: input.colecaoId,
          quantidade_produzida: input.quantidadeProduzida,
          custo_total_unitario: input.custoTotalUnitario,
          status: "rascunho",
        })
        .select()
        .single();
      if (erroProduto) throw erroProduto;

      try {
        if (input.servicos.length > 0) {
          const { error } = await supabase.from("produto_servicos").insert(
            input.servicos.map((s) => ({
              produto_id: produto.id,
              servico_fornecedor_id: s.servicoFornecedorId,
              categoria_produto_id: s.categoriaProdutoId,
              preco_unitario: s.precoUnitario,
              tempo_minutos: s.tempoMinutos,
              custo_por_minuto_aplicado: s.custoPorMinutoAplicado,
              valor_calculado: s.valorCalculado,
            })),
          );
          if (error) throw error;
        }

        if (input.insumos.length > 0) {
          const { error } = await supabase.from("produto_insumos").insert(
            input.insumos.map((i) => ({
              produto_id: produto.id,
              compra_insumo_id: i.compraInsumoId,
              consumo_quantidade: i.consumoQuantidade,
              desperdicio_pct: i.desperdicioPct,
              preco_unitario_aplicado: i.precoUnitarioAplicado,
              custo_calculado: i.custoCalculado,
            })),
          );
          if (error) throw error;
        }
      } catch (err) {
        // Reverte o produto se os itens não puderem ser salvos, para não deixar registro órfão.
        await supabase.from("produtos").delete().eq("id", produto.id);
        throw err;
      }

      return produto;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["servico_ultimo_preco"] });
    },
  });
}

export function useAjusteEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { materialId: string; quantidade: number; tipo: "ajuste_manual" | "ajuste_inventario"; observacao: string }) => {
      const { error } = await supabase.from("movimentos_estoque").insert({
        material_id: input.materialId,
        tipo: input.tipo,
        quantidade: input.quantidade,
        observacao: input.observacao,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["movimentos_estoque"] });
    },
  });
}
