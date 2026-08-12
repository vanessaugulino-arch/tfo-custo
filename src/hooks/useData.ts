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
// Produção interna (cargos, folha e capacidade)
// ---------------------------------------------------------------------------

export type CargoProducaoRow = Tables["cargos_producao"]["Row"];

export function useCargosProducao() {
  return useQuery({
    queryKey: ["cargos_producao"],
    queryFn: async (): Promise<CargoProducaoRow[]> => {
      const { data, error } = await supabase
        .from("cargos_producao")
        .select("*")
        .eq("ativo", true)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

interface NovoCargoProducao {
  nome: string;
  salarioBase: number;
  encargosPct: number;
  beneficiosMensal: number;
  quantidadePessoas: number;
}

export function useCreateCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovoCargoProducao) => {
      const { data, error } = await supabase
        .from("cargos_producao")
        .insert({
          nome: input.nome,
          salario_base: input.salarioBase,
          encargos_pct: input.encargosPct,
          beneficios_mensal: input.beneficiosMensal,
          quantidade_pessoas: input.quantidadePessoas,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cargos_producao"] }),
  });
}

export function useUpdateCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<NovoCargoProducao>) => {
      const { id, ...resto } = input;
      const { error } = await supabase
        .from("cargos_producao")
        .update({
          ...(resto.nome !== undefined && { nome: resto.nome }),
          ...(resto.salarioBase !== undefined && { salario_base: resto.salarioBase }),
          ...(resto.encargosPct !== undefined && { encargos_pct: resto.encargosPct }),
          ...(resto.beneficiosMensal !== undefined && { beneficios_mensal: resto.beneficiosMensal }),
          ...(resto.quantidadePessoas !== undefined && { quantidade_pessoas: resto.quantidadePessoas }),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cargos_producao"] }),
  });
}

export function useRemoverCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cargos_producao").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cargos_producao"] }),
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

export type ModeloPrecificacaoServico = "colecao" | "peca_desenvolvida" | "peca_produzida" | "tempo";

export type ServicoFornecedorCompleto = Tables["servico_fornecedor"]["Row"] & {
  fornecedor: Tables["fornecedores"]["Row"];
  servico: Tables["servicos"]["Row"];
  colecao: Tables["colecoes"]["Row"] | null;
  categorias: Tables["categorias_produto"]["Row"][];
};

export function useServicosFornecedor() {
  return useQuery({
    queryKey: ["servico_fornecedor"],
    queryFn: async (): Promise<ServicoFornecedorCompleto[]> => {
      const { data, error } = await supabase
        .from("servico_fornecedor")
        .select(
          "*, fornecedor:fornecedores(*), servico:servicos(*), colecao:colecoes(*), servico_fornecedor_categoria(categoria:categorias_produto(*))",
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
  modeloPrecificacao: ModeloPrecificacaoServico;
  custoPorMinuto: number | null;
  colecaoId: string | null;
  beneficiamento: boolean;
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
          colecao_id: input.colecaoId,
          beneficiamento: input.beneficiamento,
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
// Engajamento de serviço pooled (por coleção / por peça desenvolvida)
// ---------------------------------------------------------------------------

export type ServicoEngajamento = Tables["servico_engajamento"]["Row"];

export function useServicoEngajamento(servicoFornecedorId: string | null, colecaoId: string | null) {
  return useQuery({
    queryKey: ["servico_engajamento", servicoFornecedorId, colecaoId],
    enabled: !!servicoFornecedorId && !!colecaoId,
    queryFn: async (): Promise<ServicoEngajamento | null> => {
      const { data, error } = await supabase
        .from("servico_engajamento")
        .select("*")
        .eq("servico_fornecedor_id", servicoFornecedorId!)
        .eq("colecao_id", colecaoId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Busca o engajamento pooled já existente para (serviço, coleção) ou cria um novo com o valor total informado. */
export function useGetOrCreateServicoEngajamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { servicoFornecedorId: string; colecaoId: string; valorTotalSeNovo: number }) => {
      const { data: existente, error: eBusca } = await supabase
        .from("servico_engajamento")
        .select("*")
        .eq("servico_fornecedor_id", input.servicoFornecedorId)
        .eq("colecao_id", input.colecaoId)
        .maybeSingle();
      if (eBusca) throw eBusca;
      if (existente) return existente;

      const { data, error } = await supabase
        .from("servico_engajamento")
        .insert({
          servico_fornecedor_id: input.servicoFornecedorId,
          colecao_id: input.colecaoId,
          valor_total: input.valorTotalSeNovo,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servico_engajamento"] }),
  });
}

export function useAtualizarValorEngajamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; valorTotal: number }) => {
      const { error } = await supabase
        .from("servico_engajamento")
        .update({ valor_total: input.valorTotal })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servico_engajamento"] }),
  });
}

/**
 * Estimativa provisória do custo por peça de um engajamento pooled — mesma lógica de
 * `fechar_colecao()`: para modelo "colecao" divide por TODAS as peças da coleção; para
 * "peca_desenvolvida" divide só pelas peças já vinculadas a este engajamento. Não é o
 * valor definitivo: ele só é travado quando a coleção é fechada. Função "crua" (sem hook)
 * para poder ser chamada de dentro de handlers, além de exposta como hook para exibição ao vivo.
 */
export async function calcularEstimativaCustoPecaEngajamento(
  engajamentoId: string,
  colecaoId: string,
  modeloPrecificacao: ModeloPrecificacaoServico,
  quantidadeProdutoAtual: number,
): Promise<number | null> {
  const { data: eng, error: e1 } = await supabase
    .from("servico_engajamento")
    .select("*")
    .eq("id", engajamentoId)
    .single();
  if (e1) throw e1;

  let denomExistente = 0;
  if (modeloPrecificacao === "colecao") {
    const { data, error } = await supabase
      .from("produtos")
      .select("quantidade_produzida, status")
      .eq("colecao_id", colecaoId)
      .neq("status", "descartado");
    if (error) throw error;
    denomExistente = (data ?? []).reduce((s, p) => s + (p.quantidade_produzida ?? 0), 0);
  } else {
    const { data, error } = await supabase
      .from("produto_servicos")
      .select("produto:produtos(quantidade_produzida, status)")
      .eq("servico_engajamento_id", engajamentoId);
    if (error) throw error;
    denomExistente = (data ?? []).reduce((s: number, l: any) => {
      if (l.produto && l.produto.status !== "descartado") return s + (l.produto.quantidade_produzida ?? 0);
      return s;
    }, 0);
  }
  const denom = denomExistente + quantidadeProdutoAtual;
  return denom > 0 ? eng.valor_total / denom : null;
}

export function useEstimativaCustoPecaEngajamento(
  engajamentoId: string | null,
  colecaoId: string | null,
  modeloPrecificacao: ModeloPrecificacaoServico | null,
  quantidadeProdutoAtual: number,
) {
  return useQuery({
    queryKey: ["engajamento_estimativa", engajamentoId, colecaoId, modeloPrecificacao, quantidadeProdutoAtual],
    enabled: !!engajamentoId && !!colecaoId,
    queryFn: () =>
      calcularEstimativaCustoPecaEngajamento(engajamentoId!, colecaoId!, modeloPrecificacao!, quantidadeProdutoAtual),
  });
}

export function useFecharColecao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (colecaoId: string) => {
      const { error } = await supabase.rpc("fechar_colecao", { p_colecao_id: colecaoId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["colecoes"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["servico_engajamento"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Beneficiamento (transforma um insumo em outro, com custo somado)
// ---------------------------------------------------------------------------

export type ServicoBeneficiamentoCompleto = Tables["servico_beneficiamento"]["Row"] & {
  material_origem: Tables["materiais"]["Row"];
  material_resultante: Tables["materiais"]["Row"];
};

export function useBeneficiamentosPorServico(servicoFornecedorId: string | null) {
  return useQuery({
    queryKey: ["servico_beneficiamento", servicoFornecedorId],
    enabled: !!servicoFornecedorId,
    queryFn: async (): Promise<ServicoBeneficiamentoCompleto[]> => {
      const { data, error } = await supabase
        .from("servico_beneficiamento")
        .select(
          "*, material_origem:materiais!servico_beneficiamento_material_origem_id_fkey(*), material_resultante:materiais!servico_beneficiamento_material_resultante_id_fkey(*)",
        )
        .eq("servico_fornecedor_id", servicoFornecedorId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as any;
    },
  });
}

interface NovoBeneficiamento {
  servicoFornecedorId: string;
  fornecedorId: string;
  materialOrigemId: string;
  compraInsumoOrigemId: string | null;
  materialResultanteId: string;
  quantidadeBeneficiada: number;
  custoOrigemUnitario: number;
  custoBeneficiamento: number;
  regimeTributario: string;
  dataCompra: string;
}

/**
 * Registra um beneficiamento: dá baixa no material de origem, e cria uma "compra" do
 * material resultante com o custo somado (origem + taxa de beneficiamento) dividido pela
 * quantidade — isso já entra no estoque do material resultante automaticamente.
 */
export function useAplicarBeneficiamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovoBeneficiamento) => {
      const custoTotalResultante = input.custoOrigemUnitario * input.quantidadeBeneficiada + input.custoBeneficiamento;

      const { data: compraResultante, error: eCompra } = await supabase
        .from("compras_insumo")
        .insert({
          fornecedor_id: input.fornecedorId,
          material_id: input.materialResultanteId,
          pack_quantidade: 1,
          quantidade_comprada: input.quantidadeBeneficiada,
          preco_pago: custoTotalResultante,
          regime_tributario: input.regimeTributario as any,
          aliquota_credito_pct: 0,
          data_compra: input.dataCompra,
          unidade_compra: "metro" as any,
          fator_metros_por_unidade: 1,
        })
        .select()
        .single();
      if (eCompra) throw eCompra;

      try {
        const { error: eBenef } = await supabase.from("servico_beneficiamento").insert({
          servico_fornecedor_id: input.servicoFornecedorId,
          material_origem_id: input.materialOrigemId,
          material_resultante_id: input.materialResultanteId,
          compra_insumo_origem_id: input.compraInsumoOrigemId,
          compra_insumo_resultante_id: compraResultante.id,
          quantidade_beneficiada: input.quantidadeBeneficiada,
          custo_beneficiamento: input.custoBeneficiamento,
        });
        if (eBenef) throw eBenef;

        const { error: eSaida } = await supabase.from("movimentos_estoque").insert({
          material_id: input.materialOrigemId,
          tipo: "saida_beneficiamento",
          quantidade: -input.quantidadeBeneficiada,
          referencia_tipo: "servico_beneficiamento",
          referencia_id: compraResultante.id,
          observacao: "Baixa automática por beneficiamento (matéria-prima transformada)",
        });
        if (eSaida) throw eSaida;

        const { error: eUpdate } = await supabase
          .from("movimentos_estoque")
          .update({
            tipo: "entrada_beneficiamento",
            observacao: "Entrada automática por beneficiamento (matéria-prima transformada)",
          })
          .eq("referencia_tipo", "compra_insumo")
          .eq("referencia_id", compraResultante.id);
        if (eUpdate) throw eUpdate;
      } catch (err) {
        await supabase.from("movimentos_estoque").delete().eq("referencia_id", compraResultante.id);
        await supabase.from("compras_insumo").delete().eq("id", compraResultante.id);
        throw err;
      }

      return compraResultante;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras_insumo"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["movimentos_estoque"] });
      qc.invalidateQueries({ queryKey: ["servico_beneficiamento"] });
    },
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
  /** true quando ao menos um serviço deste produto é "por coleção"/"peça desenvolvida" — custo só é definitivo após fechar a coleção. */
  temCustoPooled: boolean;
};

export function useProdutos(colecaoId?: string) {
  return useQuery({
    queryKey: ["produtos", colecaoId ?? "todos"],
    queryFn: async (): Promise<ProdutoCompleto[]> => {
      let query = supabase
        .from("produtos")
        .select("*, categoria:categorias_produto(*), colecao:colecoes(*), produto_servicos(servico_engajamento_id)")
        .order("criado_em", { ascending: false });
      if (colecaoId) query = query.eq("colecao_id", colecaoId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        temCustoPooled: (row.produto_servicos ?? []).some((ps: any) => ps.servico_engajamento_id != null),
      }));
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
  modeloPrecificacao: ModeloPrecificacaoServico;
  servicoEngajamentoId: string | null;
  precoUnitario: number | null;
  tempoMinutos: number | null;
  custoPorMinutoAplicado: number | null;
  /** Null quando pooled (colecao/peca_desenvolvida) e ainda não fechado — custo definitivo só existe após "fechar coleção". */
  valorCalculado: number | null;
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
  custoProducaoInternaUnitario: number | null;
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
          custo_producao_interna_unitario: input.custoProducaoInternaUnitario,
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
              servico_engajamento_id: s.servicoEngajamentoId,
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
      qc.invalidateQueries({ queryKey: ["engajamento_estimativa"] });
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
