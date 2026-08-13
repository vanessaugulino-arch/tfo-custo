import { useState } from "react";
import { Combobox } from "@/components/Combobox";
import { ComboboxMulti } from "@/components/ComboboxMulti";
import { ImportModal, type ResultadoImport } from "@/components/ImportModal";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Tour, useTourAutoShow, type TourStep } from "@/components/Tour";
import { Badge, Button, Card, Field, Input, PageTitle, Select } from "@/components/ui";
import {
  useAplicarBeneficiamento,
  useAtualizarValorEngajamento,
  useCategorias,
  useColecoes,
  useCreateCategoria,
  useCreateColecao,
  useCreateFornecedor,
  useCreateMaterial,
  useCreateServico,
  useCreateServicoFornecedor,
  useDeleteServicoFornecedor,
  useFornecedores,
  useGetOrCreateServicoEngajamento,
  useMateriais,
  useMateriaisPorFornecedor,
  useServicoFornecedorUsoCount,
  useServicos,
  useServicosFornecedor,
  useTodosBeneficiamentos,
  useTodosEngajamentos,
  useUltimaCompraPorFornecedorMaterial,
  useUpdateBeneficiamento,
  useUpdateMaterial,
  useUpdateServicoFornecedor,
  type ModeloPrecificacaoServico,
  type ServicoFornecedorCompleto,
} from "@/hooks/useData";
import { findOrCreateCategoria, findOrCreateColecao, findOrCreateFornecedor, findOrCreateServico, parseNumeroPtBr } from "@/lib/importHelpers";
import { MODELO_SERVICOS } from "@/lib/importFields";
import { formatBRL, formatNumber, labelMaterial, MODELO_PRECIFICACAO_EXPLICACAO, MODELO_PRECIFICACAO_LABELS } from "@/lib/format";

const MODELOS = Object.entries(MODELO_PRECIFICACAO_LABELS) as [ModeloPrecificacaoServico, string][];
const MODELOS_VALIDOS = new Set(["peca_produzida", "tempo"]);
const MODELOS_POOLED = new Set<ModeloPrecificacaoServico>(["colecao", "peca_desenvolvida"]);

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "servicos-colecao",
    title: "Todo serviço pertence a uma coleção",
    texto:
      "Aqui você registra um contrato específico: este fornecedor, para esta coleção, por este valor. Se o mesmo fornecedor cobra valores diferentes para coleções ou peças diferentes (ex: R$350 pelo molde da camisa, R$400 pelo molde do vestido), cadastre um serviço separado para cada um — não reaproveite o mesmo cadastro.",
  },
  {
    targetId: "servicos-modelo",
    title: "Escolha o modelo de precificação com cuidado",
    texto:
      "'Por coleção' e 'por peça desenvolvida' dividem um valor combinado (que você já informa aqui) entre as peças que usarem este serviço; 'por peça produzida' e 'por tempo' têm o valor lançado depois, na tela de produto, pois dependem da peça; 'metro corrido' cobra por metro linear. Assim que você escolher qualquer modelo, o sistema pergunta se o serviço é um beneficiamento (transforma uma matéria-prima sua em outra) — se for, os campos de origem, material resultante e custo aparecem logo abaixo.",
  },
  {
    targetId: "servicos-tabela",
    title: "Serviços já cadastrados",
    texto: "Você sempre pode editar as categorias atendidas, mesmo depois de usado em produtos. Fornecedor, tipo, modelo, coleção, valor combinado e os dados de beneficiamento só ficam travados após o primeiro uso, para não desalinhar custos já calculados — nesse caso, cadastre um novo serviço se precisar de um valor diferente.",
  },
];

interface FormServico {
  fornecedorId: string | null;
  servicoId: string | null;
  categoriaIds: string[];
  todasCategorias: boolean;
  modelo: ModeloPrecificacaoServico;
  colecaoId: string | null;
  custoPorMinuto: string;
  valorTotal: string;
  beneficiamento: boolean;
}

const FORM_VAZIO: FormServico = {
  fornecedorId: null,
  servicoId: null,
  categoriaIds: [],
  todasCategorias: false,
  modelo: "peca_desenvolvida",
  colecaoId: null,
  custoPorMinuto: "",
  valorTotal: "",
  beneficiamento: false,
};

interface FormBeneficiamento {
  fornecedorOrigemId: string | null;
  materialOrigemId: string | null;
  materialResultanteId: string | null;
  corResultante: string;
  quantidade: string;
  custo: string;
  data: string;
}

function beneficiamentoVazio(): FormBeneficiamento {
  return {
    fornecedorOrigemId: null,
    materialOrigemId: null,
    materialResultanteId: null,
    corResultante: "",
    quantidade: "",
    custo: "",
    data: new Date().toISOString().slice(0, 10),
  };
}

export function ServicosScreen() {
  const { data: fornecedores = [] } = useFornecedores();
  const { data: servicos = [] } = useServicos();
  const { data: categorias = [] } = useCategorias();
  const { data: colecoes = [] } = useColecoes();
  const { data: servicosFornecedor = [] } = useServicosFornecedor();
  const { data: beneficiamentos = [] } = useTodosBeneficiamentos();
  const { data: engajamentos = [] } = useTodosEngajamentos();
  const { data: usoMap = new Map<string, number>() } = useServicoFornecedorUsoCount();
  const { data: materiais = [] } = useMateriais();
  const createFornecedor = useCreateFornecedor();
  const createServico = useCreateServico();
  const createCategoria = useCreateCategoria();
  const createColecao = useCreateColecao();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const createServicoFornecedor = useCreateServicoFornecedor();
  const updateServicoFornecedor = useUpdateServicoFornecedor();
  const deleteServicoFornecedor = useDeleteServicoFornecedor();
  const aplicarBeneficiamento = useAplicarBeneficiamento();
  const updateBeneficiamento = useUpdateBeneficiamento();
  const getOrCreateEngajamento = useGetOrCreateServicoEngajamento();
  const atualizarValorEngajamento = useAtualizarValorEngajamento();
  const [importAberto, setImportAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoBeneficiamentoId, setEditandoBeneficiamentoId] = useState<string | null>(null);
  const [editandoEngajamentoId, setEditandoEngajamentoId] = useState<string | null>(null);
  const tour = useTourAutoShow("servicos");

  const [form, setForm] = useState<FormServico>(FORM_VAZIO);
  const [benef, setBenef] = useState<FormBeneficiamento>(beneficiamentoVazio());
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoBeneficiamento, setConfirmandoBeneficiamento] = useState(false);
  const [novaColecao, setNovaColecao] = useState(false);
  const [colecaoNome, setColecaoNome] = useState("");
  const [colecaoAno, setColecaoAno] = useState("");

  const isBeneficiamento = form.beneficiamento;
  const isPooled = MODELOS_POOLED.has(form.modelo);
  const usosDoServicoEmEdicao = editandoId ? usoMap.get(editandoId) ?? 0 : 0;
  const bloqueiaCampoCusto = usosDoServicoEmEdicao > 0;

  function engajamentoDoServico(servicoFornecedorId: string) {
    return engajamentos.find((e) => e.servico_fornecedor_id === servicoFornecedorId) ?? null;
  }

  const { data: materiaisOrigemDisponiveis = [] } = useMateriaisPorFornecedor(benef.fornecedorOrigemId);
  const { data: compraOrigem } = useUltimaCompraPorFornecedorMaterial(benef.fornecedorOrigemId, benef.materialOrigemId);

  const quantidadeBenefNum = Number(benef.quantidade) || 0;
  const custoBenefNum = Number(benef.custo) || 0;
  const custoOrigemUnitario = compraOrigem?.preco_unitario_liquido ?? 0;
  const custoUnitarioResultante =
    quantidadeBenefNum > 0 ? (custoOrigemUnitario * quantidadeBenefNum + custoBenefNum) / quantidadeBenefNum : 0;

  function handleModeloChange(novoModelo: ModeloPrecificacaoServico) {
    setForm((f) => ({ ...f, modelo: novoModelo }));
    setConfirmandoBeneficiamento(true);
  }

  function confirmarBeneficiamento(ehBeneficiamento: boolean) {
    setConfirmandoBeneficiamento(false);
    setForm((f) => ({ ...f, beneficiamento: ehBeneficiamento }));
    if (!ehBeneficiamento) setBenef(beneficiamentoVazio());
  }

  async function handleCriarColecao() {
    if (!colecaoNome.trim()) return;
    const nova = await createColecao.mutateAsync({ nome: colecaoNome.trim(), ano: Number(colecaoAno) || null });
    setForm((f) => ({ ...f, colecaoId: nova.id }));
    setNovaColecao(false);
    setColecaoNome("");
    setColecaoAno("");
  }

  async function handleImportar(linhas: Record<string, string>[]): Promise<ResultadoImport> {
    let sucesso = 0;
    const erros: ResultadoImport["erros"] = [];
    for (let i = 0; i < linhas.length; i++) {
      const row = linhas[i];
      try {
        if (!row.fornecedor?.trim() || !row.servico?.trim()) throw new Error("fornecedor ou serviço vazio");
        if (!row.colecao?.trim()) throw new Error("coleção vazia — todo serviço precisa pertencer a uma coleção");
        const modeloRow = row.modelo_precificacao?.trim().toLowerCase();
        if (!MODELOS_VALIDOS.has(modeloRow))
          throw new Error(
            "modelo de precificação inválido para importação em lote (use peca_produzida ou tempo — 'colecao', 'peca_desenvolvida' e 'metro_corrido' exigem escolher o valor combinado manualmente)",
          );
        const custoPorMinuto = modeloRow === "tempo" ? parseNumeroPtBr(row.custo_por_minuto) : null;
        if (modeloRow === "tempo" && !(Number(custoPorMinuto) > 0)) throw new Error("custo por minuto obrigatório para o modelo 'tempo'");

        const fornecedorId = await findOrCreateFornecedor(row.fornecedor);
        const servicoId = await findOrCreateServico(row.servico);
        const colecaoIdRow = await findOrCreateColecao(row.colecao);
        const nomesCategorias = (row.categorias ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const categoriaIdsRow: string[] = [];
        for (const nome of nomesCategorias) categoriaIdsRow.push(await findOrCreateCategoria(nome));

        await createServicoFornecedor.mutateAsync({
          fornecedorId,
          servicoId,
          modeloPrecificacao: modeloRow as ModeloPrecificacaoServico,
          custoPorMinuto,
          colecaoId: colecaoIdRow,
          beneficiamento: false,
          todasCategorias: false,
          categoriaIds: categoriaIdsRow,
        });
        sucesso++;
      } catch (err) {
        erros.push({ linha: i + 2, motivo: err instanceof Error ? err.message : String(err) });
      }
    }
    return { sucesso, erros };
  }

  function beneficiamentoDoServico(servicoFornecedorId: string) {
    return beneficiamentos.find((b) => b.servico_fornecedor_id === servicoFornecedorId) ?? null;
  }

  function iniciarEdicao(sf: ServicoFornecedorCompleto) {
    setEditandoId(sf.id);
    const eng = engajamentoDoServico(sf.id);
    setForm({
      fornecedorId: sf.fornecedor_id,
      servicoId: sf.servico_id,
      categoriaIds: sf.categorias.map((c) => c.id),
      todasCategorias: sf.todas_categorias,
      modelo: sf.modelo_precificacao as ModeloPrecificacaoServico,
      colecaoId: sf.colecao_id,
      custoPorMinuto: sf.custo_por_minuto != null ? String(sf.custo_por_minuto) : "",
      valorTotal: eng ? String(eng.valor_total) : "",
      beneficiamento: sf.beneficiamento,
    });
    setEditandoEngajamentoId(eng?.id ?? null);
    const b = beneficiamentoDoServico(sf.id);
    if (b) {
      setEditandoBeneficiamentoId(b.id);
      setBenef({
        fornecedorOrigemId: b.compra_insumo_origem?.fornecedor_id ?? null,
        materialOrigemId: b.material_origem_id,
        materialResultanteId: b.material_resultante_id,
        corResultante: b.material_resultante.cor ?? "",
        quantidade: String(b.quantidade_beneficiada),
        custo: String(b.custo_beneficiamento),
        data: b.compra_insumo_resultante?.data_compra ?? new Date().toISOString().slice(0, 10),
      });
    } else {
      setEditandoBeneficiamentoId(null);
      setBenef(beneficiamentoVazio());
    }
    setErro(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditandoBeneficiamentoId(null);
    setEditandoEngajamentoId(null);
    setForm(FORM_VAZIO);
    setBenef(beneficiamentoVazio());
    setErro(null);
    setNovaColecao(false);
    setColecaoNome("");
    setColecaoAno("");
  }

  async function handleExcluir(id: string) {
    const ok = window.confirm("Excluir este serviço? Essa ação não pode ser desfeita.");
    if (!ok) return;
    try {
      await deleteServicoFornecedor.mutateAsync(id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível excluir este serviço.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.fornecedorId || !form.servicoId) {
      setErro("Selecione ou crie um fornecedor e um tipo de serviço.");
      return;
    }
    if (form.modelo === "tempo" && (!form.custoPorMinuto || Number(form.custoPorMinuto) <= 0)) {
      setErro("Informe o custo por minuto de produção.");
      return;
    }
    if (!form.colecaoId) {
      setErro("Selecione para qual coleção é este serviço.");
      return;
    }
    if (isPooled && !(Number(form.valorTotal) > 0)) {
      setErro("Informe o valor total combinado com o fornecedor.");
      return;
    }
    if (isBeneficiamento) {
      if (!benef.fornecedorOrigemId || !benef.materialOrigemId || !benef.materialResultanteId) {
        setErro("Preencha o fornecedor de origem, o material de origem e o material resultante do beneficiamento.");
        return;
      }
      if (!benef.corResultante.trim()) {
        setErro("Informe a cor/característica do material resultante.");
        return;
      }
      if (quantidadeBenefNum <= 0) {
        setErro("Informe a quantidade beneficiada.");
        return;
      }
      if (!compraOrigem) {
        setErro(
          `Não há compra de "${materiais.find((m) => m.id === benef.materialOrigemId)?.nome}" registrada com ${
            fornecedores.find((f) => f.id === benef.fornecedorOrigemId)?.nome
          } na tela de Insumos. Cadastre essa compra primeiro.`,
        );
        return;
      }
    }

    const payload = {
      fornecedorId: form.fornecedorId,
      servicoId: form.servicoId,
      modeloPrecificacao: form.modelo,
      custoPorMinuto: form.modelo === "tempo" ? Number(form.custoPorMinuto) : null,
      colecaoId: form.colecaoId,
      beneficiamento: isBeneficiamento,
      todasCategorias: form.todasCategorias,
      categoriaIds: form.todasCategorias ? categorias.map((c) => c.id) : form.categoriaIds,
    };

    try {
      if (isBeneficiamento) {
        const materialResultanteAtual = materiais.find((m) => m.id === benef.materialResultanteId);
        if (benef.corResultante.trim() !== (materialResultanteAtual?.cor ?? "")) {
          await updateMaterial.mutateAsync({ id: benef.materialResultanteId!, cor: benef.corResultante.trim() });
        }
      }

      if (editandoId) {
        const tarefas: Promise<unknown>[] = [updateServicoFornecedor.mutateAsync({ id: editandoId, ...payload })];
        if (isPooled && !bloqueiaCampoCusto) {
          tarefas.push(
            editandoEngajamentoId
              ? atualizarValorEngajamento.mutateAsync({
                  id: editandoEngajamentoId,
                  valorTotal: Number(form.valorTotal),
                  colecaoId: form.colecaoId!,
                })
              : getOrCreateEngajamento.mutateAsync({
                  servicoFornecedorId: editandoId,
                  colecaoId: form.colecaoId!,
                  valorTotalSeNovo: Number(form.valorTotal),
                }),
          );
        }
        if (isBeneficiamento && compraOrigem) {
          tarefas.push(
            editandoBeneficiamentoId
              ? updateBeneficiamento.mutateAsync({
                  id: editandoBeneficiamentoId,
                  materialOrigemId: benef.materialOrigemId!,
                  compraInsumoOrigemId: compraOrigem.id!,
                  materialResultanteId: benef.materialResultanteId!,
                  quantidadeBeneficiada: quantidadeBenefNum,
                  custoOrigemUnitario,
                  custoBeneficiamento: custoBenefNum,
                  dataCompra: benef.data,
                })
              : aplicarBeneficiamento.mutateAsync({
                  servicoFornecedorId: editandoId,
                  fornecedorId: form.fornecedorId,
                  materialOrigemId: benef.materialOrigemId!,
                  compraInsumoOrigemId: compraOrigem.id!,
                  materialResultanteId: benef.materialResultanteId!,
                  quantidadeBeneficiada: quantidadeBenefNum,
                  custoOrigemUnitario,
                  custoBeneficiamento: custoBenefNum,
                  regimeTributario: compraOrigem.regime_tributario ?? "simples_nacional",
                  dataCompra: benef.data,
                }),
          );
        }
        await Promise.all(tarefas);
        cancelarEdicao();
        return;
      }

      const criado = await createServicoFornecedor.mutateAsync(payload);
      const tarefas: Promise<unknown>[] = [];
      if (isPooled) {
        tarefas.push(
          getOrCreateEngajamento.mutateAsync({
            servicoFornecedorId: criado.id,
            colecaoId: form.colecaoId!,
            valorTotalSeNovo: Number(form.valorTotal),
          }),
        );
      }
      if (isBeneficiamento && compraOrigem) {
        tarefas.push(
          aplicarBeneficiamento.mutateAsync({
            servicoFornecedorId: criado.id,
            fornecedorId: form.fornecedorId,
            materialOrigemId: benef.materialOrigemId!,
            compraInsumoOrigemId: compraOrigem.id!,
            materialResultanteId: benef.materialResultanteId!,
            quantidadeBeneficiada: quantidadeBenefNum,
            custoOrigemUnitario,
            custoBeneficiamento: custoBenefNum,
            regimeTributario: compraOrigem.regime_tributario ?? "simples_nacional",
            dataCompra: benef.data,
          }),
        );
      }
      await Promise.all(tarefas);
      setForm(FORM_VAZIO);
      setBenef(beneficiamentoVazio());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar este serviço.");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title="Serviços"
          subtitle="Modelagem, corte, costura e outros serviços contratados de terceiros — o preço efetivo é lançado depois, na tela de produto."
        />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={tour.abrir}>
            Tour desta tela
          </Button>
          <Button variant="secondary" onClick={() => setImportAberto(true)}>
            Importar planilha
          </Button>
        </div>
      </div>

      <Tour steps={TOUR_STEPS} aberto={tour.aberto} onFechar={tour.fechar} />

      {importAberto && (
        <ImportModal modelo={MODELO_SERVICOS} onClose={() => setImportAberto(false)} onConfirmar={handleImportar} />
      )}

      {confirmandoBeneficiamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm px-4">
          <Card className="max-w-lg">
            <h2 className="mb-2 text-base font-semibold">Esse serviço é um beneficiamento de uma matéria-prima?</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              <strong>Beneficiamento</strong> é quando o fornecedor transforma uma matéria-prima sua inteira, antes de
              ela ser cortada — ex: tingir ou estampar um tecido inteiro (rolo). Ele "sai" do estoque como um material
              e "entra" de volta como outro.
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              Isso é diferente de um <strong>acabamento</strong>, que acontece numa peça já cortada ou pronta — ex:
              tingir ou estampar depois de cortada. Se for esse o caso, responda "Não" — o modelo de precificação
              escolhido continua valendo normalmente.
            </p>
            <div className="flex gap-2">
              <Button type="button" onClick={() => confirmarBeneficiamento(true)}>
                Sim, é um beneficiamento
              </Button>
              <Button type="button" variant="secondary" onClick={() => confirmarBeneficiamento(false)}>
                Não, é outra coisa
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card className="mb-8">
        {editandoId && (
          <div className="mb-4 flex items-center justify-between rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground">
            {bloqueiaCampoCusto
              ? `Editando serviço já usado em ${usosDoServicoEmEdicao} produto${usosDoServicoEmEdicao > 1 ? "s" : ""} — fornecedor, tipo, modelo de precificação, coleção, valor combinado e os dados de beneficiamento ficam travados para não alterar custos já calculados. Você pode alterar as categorias atendidas.`
              : "Editando serviço já cadastrado."}
            <button type="button" className="underline" onClick={cancelarEdicao}>
              Cancelar edição
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <Field label="Fornecedor">
            <Combobox
              options={fornecedores.map((f) => ({ id: f.id, label: `${f.nome}${f.codigo ? ` (${f.codigo})` : ""}` }))}
              value={form.fornecedorId}
              onChange={(v) => setForm((f) => ({ ...f, fornecedorId: v }))}
              onCreate={async (nome) => (await createFornecedor.mutateAsync(nome)).id}
              placeholder="Selecionar ou cadastrar fornecedor..."
              disabled={bloqueiaCampoCusto}
            />
          </Field>
          <Field label="Tipo de serviço">
            <Combobox
              options={servicos.map((s) => ({ id: s.id, label: `${s.nome}${s.codigo ? ` (${s.codigo})` : ""}` }))}
              value={form.servicoId}
              onChange={(v) => setForm((f) => ({ ...f, servicoId: v }))}
              onCreate={async (nome) => (await createServico.mutateAsync(nome)).id}
              placeholder="Selecionar ou cadastrar serviço..."
              disabled={bloqueiaCampoCusto}
            />
          </Field>

          <Field
            label="Categorias de produto atendidas"
            hint={
              <InfoTooltip>
                Categorias como "Camisa" ou "Calça" — as mesmas usadas na tela de produto. Digite para selecionar uma já
                existente ou criar uma nova, sem sair desta tela. Use "Todas as categorias" se este serviço atende
                qualquer categoria — inclusive as que você ainda vai criar.
              </InfoTooltip>
            }
          >
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, todasCategorias: !f.todasCategorias, categoriaIds: [] }))}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  form.todasCategorias
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                {form.todasCategorias ? "✓ Todas as categorias" : "Todas as categorias"}
              </button>
            </div>
            {form.todasCategorias ? (
              <p className="text-xs text-muted-foreground">
                Atende todas as categorias já cadastradas — e vai atender automaticamente qualquer categoria nova que
                você criar depois.
              </p>
            ) : (
              <ComboboxMulti
                options={categorias.map((c) => ({ id: c.id, label: c.nome }))}
                values={form.categoriaIds}
                onChange={(v) => setForm((f) => ({ ...f, categoriaIds: v }))}
                onCreate={async (nome) => (await createCategoria.mutateAsync(nome)).id}
                placeholder="Selecionar ou criar categorias..."
              />
            )}
          </Field>
          <Field
            label="Modelo de precificação"
            data-tour="servicos-modelo"
            hint={
              <InfoTooltip>
                <strong>Por coleção:</strong> {MODELO_PRECIFICACAO_EXPLICACAO.colecao}
                <br />
                <strong>Por peça desenvolvida:</strong> {MODELO_PRECIFICACAO_EXPLICACAO.peca_desenvolvida}
                <br />
                <strong>Por peça produzida:</strong> {MODELO_PRECIFICACAO_EXPLICACAO.peca_produzida}
                <br />
                <strong>Por tempo:</strong> {MODELO_PRECIFICACAO_EXPLICACAO.tempo}
                <br />
                <strong>Metro corrido:</strong> {MODELO_PRECIFICACAO_EXPLICACAO.metro_corrido}
              </InfoTooltip>
            }
          >
            <Select
              value={form.modelo}
              onChange={(e) => handleModeloChange(e.target.value as ModeloPrecificacaoServico)}
              disabled={bloqueiaCampoCusto}
            >
              {MODELOS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Coleção"
            data-tour="servicos-colecao"
            hint={
              <InfoTooltip>
                Todo serviço pertence a uma coleção — é o que identifica este contrato específico. Se o mesmo
                fornecedor cobra valores diferentes para peças ou coleções diferentes, cadastre um serviço separado
                para cada um, em vez de reaproveitar este.
              </InfoTooltip>
            }
          >
            {!novaColecao ? (
              <div className="flex gap-2">
                <Select
                  value={form.colecaoId ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, colecaoId: e.target.value || null }))}
                  disabled={bloqueiaCampoCusto}
                  className="flex-1"
                >
                  <option value="">Selecionar coleção...</option>
                  {colecoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
                {!bloqueiaCampoCusto && (
                  <Button type="button" variant="secondary" onClick={() => setNovaColecao(true)}>
                    + Nova
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                <Input placeholder="Nome da coleção" value={colecaoNome} onChange={(e) => setColecaoNome(e.target.value)} />
                <Input
                  type="number"
                  placeholder="Ano da coleção (ex: 2026)"
                  value={colecaoAno}
                  onChange={(e) => setColecaoAno(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={handleCriarColecao} disabled={createColecao.isPending}>
                    Criar coleção
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setNovaColecao(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </Field>

          {form.modelo === "tempo" && (
            <Field label="Custo por minuto de produção (R$)">
              <Input
                type="number"
                min="0"
                step="any"
                value={form.custoPorMinuto}
                onChange={(e) => setForm((f) => ({ ...f, custoPorMinuto: e.target.value }))}
                disabled={bloqueiaCampoCusto}
              />
            </Field>
          )}
          {isPooled && (
            <Field
              label="Valor total combinado (R$)"
              hint={
                <InfoTooltip>
                  O valor combinado com o fornecedor para este contrato. Será dividido entre as peças que usarem este
                  serviço específico (ou entre todas as peças da coleção, no caso de "por coleção") quando a coleção
                  for "fechada".
                </InfoTooltip>
              }
            >
              <Input
                type="number"
                min="0"
                step="any"
                value={form.valorTotal}
                onChange={(e) => setForm((f) => ({ ...f, valorTotal: e.target.value }))}
                placeholder="ex: 350,00"
                disabled={bloqueiaCampoCusto}
              />
            </Field>
          )}
          {form.modelo === "peca_produzida" && (
            <div className="flex items-end text-sm text-muted-foreground">
              O preço é o último valor já pago a este fornecedor, por categoria — lançado na tela de produto, sem
              diluição.
            </div>
          )}

          {isBeneficiamento && (
            <div className="col-span-2 grid grid-cols-2 gap-4 rounded-md border border-border p-4">
              <Field
                label="Fornecedor de origem (quem vendeu o material)"
                hint={
                  <InfoTooltip>
                    Pode ser diferente do fornecedor do serviço acima — é quem vendeu a matéria-prima que vai ser
                    beneficiada, cadastrado na tela de Insumos.
                  </InfoTooltip>
                }
              >
                <Combobox
                  options={fornecedores.map((f) => ({ id: f.id, label: f.nome }))}
                  value={benef.fornecedorOrigemId}
                  onChange={(v) => setBenef((b) => ({ ...b, fornecedorOrigemId: v, materialOrigemId: null }))}
                  placeholder="Selecionar fornecedor..."
                  disabled={bloqueiaCampoCusto}
                />
              </Field>
              <Field
                label="Material de origem (o que sai do estoque)"
                hint={<InfoTooltip>Só mostra materiais já comprados desse fornecedor.</InfoTooltip>}
              >
                <Combobox
                  options={materiaisOrigemDisponiveis.map((m) => ({ id: m.id, label: labelMaterial(m) }))}
                  value={benef.materialOrigemId}
                  onChange={(v) => setBenef((b) => ({ ...b, materialOrigemId: v }))}
                  disabled={bloqueiaCampoCusto || !benef.fornecedorOrigemId}
                  placeholder={benef.fornecedorOrigemId ? "Selecionar material..." : "Selecione o fornecedor de origem primeiro"}
                />
              </Field>

              <Field label="Material resultante (o que entra no estoque)">
                <Combobox
                  options={materiais.map((m) => ({ id: m.id, label: labelMaterial(m) }))}
                  value={benef.materialResultanteId}
                  onChange={(v) =>
                    setBenef((b) => ({ ...b, materialResultanteId: v, corResultante: materiais.find((m) => m.id === v)?.cor ?? "" }))
                  }
                  onCreate={async (nome) => {
                    const criado = await createMaterial.mutateAsync(nome);
                    setBenef((b) => ({ ...b, materialResultanteId: criado.id }));
                    return criado.id;
                  }}
                  placeholder="ex: Algodão estampa dinossauro (criar novo)"
                  disabled={bloqueiaCampoCusto}
                />
              </Field>
              <Field
                label="Cor/Característica do material resultante"
                hint={
                  <InfoTooltip>
                    Obrigatório. Pode ser uma cor (ex: "verde") ou outra característica que diferencie o resultado (ex:
                    "estampa dinossauro", "tingido azul-marinho") — é isso que separa este material de outras variantes
                    no estoque.
                  </InfoTooltip>
                }
              >
                <Input
                  value={benef.corResultante}
                  onChange={(e) => setBenef((b) => ({ ...b, corResultante: e.target.value }))}
                  placeholder="ex: dinossauro"
                  disabled={bloqueiaCampoCusto}
                />
              </Field>

              <Field
                label="Quantidade beneficiada (m)"
                hint={
                  <InfoTooltip>
                    Quantos metros do material de origem foram enviados para o beneficiamento — essa mesma quantidade
                    entra no estoque do material resultante.
                  </InfoTooltip>
                }
              >
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={benef.quantidade}
                  onChange={(e) => setBenef((b) => ({ ...b, quantidade: e.target.value }))}
                  disabled={bloqueiaCampoCusto}
                />
              </Field>
              <Field label="Taxa de beneficiamento (R$ total)">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={benef.custo}
                  onChange={(e) => setBenef((b) => ({ ...b, custo: e.target.value }))}
                  placeholder="Valor cobrado pelo fornecedor"
                  disabled={bloqueiaCampoCusto}
                />
              </Field>
              <Field label="Data">
                <Input
                  type="date"
                  value={benef.data}
                  onChange={(e) => setBenef((b) => ({ ...b, data: e.target.value }))}
                  disabled={bloqueiaCampoCusto}
                />
              </Field>

              {benef.fornecedorOrigemId && benef.materialOrigemId && !compraOrigem && (
                <div className="col-span-2 text-sm text-destructive">
                  Não há compra de "{materiais.find((m) => m.id === benef.materialOrigemId)?.nome}" registrada com{" "}
                  {fornecedores.find((f) => f.id === benef.fornecedorOrigemId)?.nome} na tela de Insumos. Cadastre essa
                  compra primeiro.
                </div>
              )}
              {compraOrigem && quantidadeBenefNum > 0 && (
                <div className="col-span-2 rounded-md bg-muted px-4 py-3 text-sm">
                  Custo da origem: {formatNumber(quantidadeBenefNum)}m × {formatBRL(custoOrigemUnitario)} ={" "}
                  {formatBRL(custoOrigemUnitario * quantidadeBenefNum)} + taxa {formatBRL(custoBenefNum)} ={" "}
                  <strong>{formatBRL(custoOrigemUnitario * quantidadeBenefNum + custoBenefNum)}</strong> total → custo
                  unitário do resultante: <strong>{formatBRL(custoUnitarioResultante)}/m</strong>
                </div>
              )}
            </div>
          )}

          {erro && <div className="col-span-2 text-sm text-destructive">{erro}</div>}

          <div className="col-span-2 flex gap-2">
            <Button
              type="submit"
              disabled={createServicoFornecedor.isPending || updateServicoFornecedor.isPending || aplicarBeneficiamento.isPending || updateBeneficiamento.isPending}
            >
              {createServicoFornecedor.isPending || updateServicoFornecedor.isPending || aplicarBeneficiamento.isPending || updateBeneficiamento.isPending
                ? "Salvando..."
                : editandoId
                  ? "Salvar alterações"
                  : "Cadastrar serviço"}
            </Button>
            {editandoId && (
              <Button type="button" variant="ghost" onClick={cancelarEdicao}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="mb-8" data-tour="servicos-tabela">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Serviços cadastrados</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Fornecedor</th>
                <th className="py-2 pr-4">Serviço</th>
                <th className="py-2 pr-4">Categorias</th>
                <th className="py-2 pr-4">Modelo</th>
                <th className="py-2 pr-4">Coleção</th>
                <th className="py-2 pr-4">Custo/minuto</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {servicosFornecedor.map((sf) => {
                const usados = usoMap.get(sf.id) ?? 0;
                const b = sf.beneficiamento ? beneficiamentoDoServico(sf.id) : null;
                return (
                  <tr key={sf.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{sf.fornecedor?.nome}</td>
                    <td className="py-2 pr-4">
                      {sf.servico?.nome}
                      {sf.beneficiamento && (
                        <div className="mt-1">
                          <Badge tone="muted">Beneficiamento</Badge>
                          {b && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {labelMaterial(b.material_origem)} → {labelMaterial(b.material_resultante)}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {sf.todas_categorias ? (
                          <Badge>Todas</Badge>
                        ) : (
                          sf.categorias.map((c) => <Badge key={c.id}>{c.nome}</Badge>)
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4">{MODELO_PRECIFICACAO_LABELS[sf.modelo_precificacao]}</td>
                    <td className="py-2 pr-4">{sf.colecao?.nome ?? "—"}</td>
                    <td className="py-2 pr-4">{sf.custo_por_minuto ? formatBRL(sf.custo_por_minuto) : "—"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="underline"
                          onClick={() => iniciarEdicao(sf)}
                          title={usados > 0 ? `Já usado em ${usados} produto(s) — apenas as categorias podem ser alteradas` : undefined}
                        >
                          Editar
                        </button>
                        <button type="button" className="text-destructive" onClick={() => handleExcluir(sf.id)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {servicosFornecedor.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    Nenhum serviço cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
