import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Combobox } from "@/components/Combobox";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Tour, useTourAutoShow, type TourStep } from "@/components/Tour";
import { Badge, Button, Card, Checkbox, Field, Input, PageTitle, Select } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import {
  calcularEstimativaCustoPecaEngajamento,
  useCargosProducao,
  useCategorias,
  useColecoes,
  useCreateCategoria,
  useCreateColecao,
  useCreateProdutoCompleto,
  useEstoqueAtual,
  useFornecedores,
  useFornecedoresPorMaterial,
  useMateriais,
  usePerfilNegocio,
  useServicoEngajamento,
  useServicosFornecedor,
  useUltimaCompraPorFornecedorMaterial,
  useUltimoPrecoServico,
  type ModeloPrecificacaoServico,
  type NovaLinhaInsumoProduto,
  type NovaLinhaServicoProduto,
} from "@/hooks/useData";
import { custoInsumoPorPeca, custoMensalCargo, custoProducaoInternaPorPeca, custoServicoPorPeca, custoTotalProduto } from "@/engine/custo";
import { descricaoProduto, formatBRL, formatNumber, labelMaterial, MODELO_PRECIFICACAO_LABELS } from "@/lib/format";

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "produto-colecao",
    title: "A coleção define quais serviços aparecem aqui",
    texto:
      "Só serviços cadastrados para a mesma coleção deste produto podem ser adicionados — escolha a coleção com atenção antes de ir para os serviços.",
  },
  {
    targetId: "produto-servicos",
    title: "Serviços compartilhados aparecem como 'provisório'",
    texto:
      "Serviços 'por coleção' ou 'por peça desenvolvida' já vêm com o valor combinado definido lá no cadastro em Serviços — aqui você só escolhe qual usar. O custo por peça mostrado é uma estimativa que muda conforme mais peças usam o mesmo serviço, e só fica definitivo quando você 'fecha' a coleção.",
  },
  {
    targetId: "produto-producao-interna",
    title: "Inclua o custo da sua equipe própria (opcional)",
    texto:
      "Se você já cadastrou cargos e capacidade em 'Produção interna', pode incluir aqui o custo de mão de obra própria diluído pela quantidade deste produto.",
  },
  {
    targetId: "produto-total",
    title: "Custo unitário estimado",
    texto: "Soma insumos + serviços + produção interna (se incluída). Esse valor é congelado no momento em que você salva o produto.",
  },
];

interface ServicoLinhaUI extends NovaLinhaServicoProduto {
  key: string;
  label: string;
  /** true para modelos "colecao"/"peca_desenvolvida" — o custo mostrado é uma estimativa até a coleção ser fechada. */
  provisorio: boolean;
}

interface InsumoLinhaUI extends NovaLinhaInsumoProduto {
  key: string;
  label: string;
  materialId: string;
  fornecedorId: string;
}

export function NovoProdutoScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: perfil } = usePerfilNegocio(user?.id);
  const { data: categorias = [] } = useCategorias();
  const { data: colecoes = [] } = useColecoes();
  const { data: servicosFornecedor = [] } = useServicosFornecedor();
  const { data: fornecedores = [] } = useFornecedores();
  const { data: materiais = [] } = useMateriais();
  const { data: estoqueAtual = [] } = useEstoqueAtual();
  const { data: cargos = [] } = useCargosProducao();
  const createColecao = useCreateColecao();
  const createCategoria = useCreateCategoria();
  const createProduto = useCreateProdutoCompleto();
  const tour = useTourAutoShow("novo_produto");

  const temProducaoInterna = perfil?.modelo_producao === "propria" || perfil?.modelo_producao === "misto";
  const folhaMensalTotal = cargos.reduce(
    (acc, c) =>
      acc +
      custoMensalCargo({
        salarioBase: c.salario_base,
        encargosPct: c.encargos_pct,
        beneficiosMensal: c.beneficios_mensal,
        quantidadePessoas: c.quantidade_pessoas,
      }),
    0,
  );
  const capacidadeMensal = perfil?.capacidade_mensal_pecas ?? 0;
  const [incluirProducaoInterna, setIncluirProducaoInterna] = useState(false);
  const [ajusteProducaoInternaPct, setAjusteProducaoInternaPct] = useState("0");

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cor, setCor] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [colecaoId, setColecaoId] = useState<string | null>(null);
  const [novaColecao, setNovaColecao] = useState(false);
  const [colecaoNome, setColecaoNome] = useState("");
  const [quantidadeProduzida, setQuantidadeProduzida] = useState("");
  const quantidadeProduzidaNum = Number(quantidadeProduzida) || 0;
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [produtoSalvoCodigo, setProdutoSalvoCodigo] = useState<string | null>(null);

  const [servicosLinhas, setServicosLinhas] = useState<ServicoLinhaUI[]>([]);
  const [insumosLinhas, setInsumosLinhas] = useState<InsumoLinhaUI[]>([]);

  // --- draft: nova linha de serviço ---
  const [draftServicoFornecedorId, setDraftServicoFornecedorId] = useState<string | null>(null);
  const [draftPrecoUnitario, setDraftPrecoUnitario] = useState("");
  const [draftTempoMinutos, setDraftTempoMinutos] = useState("");

  const draftServico = servicosFornecedor.find((sf) => sf.id === draftServicoFornecedorId) ?? null;
  const draftPooled = draftServico?.modelo_precificacao === "colecao" || draftServico?.modelo_precificacao === "peca_desenvolvida";
  // Todo serviço já vem com a coleção travada desde o cadastro em Serviços.
  const draftColecaoEfetivaId = draftServico?.colecao_id ?? null;
  const draftColecaoConflita = !!draftServico && draftServico.colecao_id !== null && draftServico.colecao_id !== colecaoId;
  const { data: precoSugerido } = useUltimoPrecoServico(
    draftServicoFornecedorId,
    draftServico?.modelo_precificacao === "peca_produzida" ? categoriaId : null,
  );
  const { data: engajamentoExistente } = useServicoEngajamento(
    draftPooled ? draftServicoFornecedorId : null,
    draftPooled ? draftColecaoEfetivaId : null,
  );
  const [estimativaEngajamentoExistente, setEstimativaEngajamentoExistente] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    if (engajamentoExistente && draftColecaoEfetivaId && draftServico) {
      calcularEstimativaCustoPecaEngajamento(
        engajamentoExistente.id,
        draftColecaoEfetivaId,
        draftServico.modelo_precificacao as any,
        quantidadeProduzidaNum,
      ).then((v) => {
        if (!cancelado) setEstimativaEngajamentoExistente(v);
      });
    } else {
      setEstimativaEngajamentoExistente(null);
    }
    return () => {
      cancelado = true;
    };
  }, [engajamentoExistente, draftColecaoEfetivaId, draftServico, quantidadeProduzidaNum]);

  // --- draft: nova linha de insumo ---
  const [draftFornecedorId, setDraftFornecedorId] = useState<string | null>(null);
  const [draftMaterialId, setDraftMaterialId] = useState<string | null>(null);
  const [draftConsumo, setDraftConsumo] = useState("");
  const [draftDesperdicio, setDraftDesperdicio] = useState("0");
  const { data: compraVigente } = useUltimaCompraPorFornecedorMaterial(draftFornecedorId, draftMaterialId);
  const { data: fornecedoresDoMaterial = [] } = useFornecedoresPorMaterial(draftMaterialId);

  const custoServicosEInsumos = useMemo(
    () => custoTotalProduto(servicosLinhas, insumosLinhas),
    [servicosLinhas, insumosLinhas],
  );

  const resultadoProducaoInterna = custoProducaoInternaPorPeca(
    folhaMensalTotal,
    capacidadeMensal,
    Number(ajusteProducaoInternaPct) || 0,
    quantidadeProduzidaNum,
  );
  const custoProducaoInternaUnitario = incluirProducaoInterna ? resultadoProducaoInterna.custoPorPeca : null;
  const custoTotal = custoServicosEInsumos + (custoProducaoInternaUnitario ?? 0);

  // Necessidade total por material (soma quando o mesmo material aparece em mais de uma linha).
  const necessidadePorMaterial = useMemo(() => {
    const mapa = new Map<string, number>();
    insumosLinhas.forEach((l) => {
      const necessidade = l.consumoQuantidade * (1 + l.desperdicioPct / 100) * quantidadeProduzidaNum;
      mapa.set(l.materialId, (mapa.get(l.materialId) ?? 0) + necessidade);
    });
    return mapa;
  }, [insumosLinhas, quantidadeProduzidaNum]);

  function checarEstoque(materialId: string) {
    const necessario = necessidadePorMaterial.get(materialId) ?? 0;
    const disponivel = estoqueAtual.find((e) => e.material_id === materialId)?.saldo_atual ?? 0;
    return { falta: quantidadeProduzidaNum > 0 && necessario > disponivel, necessario, disponivel };
  }

  async function handleCriarColecao() {
    if (!colecaoNome.trim()) return;
    const nova = await createColecao.mutateAsync({ nome: colecaoNome.trim() });
    setColecaoId(nova.id);
    setNovaColecao(false);
    setColecaoNome("");
  }

  async function addServicoLinha() {
    if (!draftServico) return;
    const modelo = draftServico.modelo_precificacao as ModeloPrecificacaoServico;
    setErro(null);

    if (draftPooled) {
      if (draftColecaoConflita) {
        setErro(`Este serviço está preso à coleção "${draftServico.colecao?.nome}" — não pode ser usado num produto de outra coleção.`);
        return;
      }
      if (!draftColecaoEfetivaId) {
        setErro("Selecione a coleção do produto acima antes de adicionar este serviço.");
        return;
      }
      if (!engajamentoExistente) {
        setErro("Este serviço ainda não tem um valor combinado definido — vá em Serviços e edite o cadastro para informar o valor.");
        return;
      }
      const estimativa = await calcularEstimativaCustoPecaEngajamento(
        engajamentoExistente.id,
        draftColecaoEfetivaId,
        modelo,
        quantidadeProduzidaNum,
      );

      const linha: ServicoLinhaUI = {
        key: crypto.randomUUID(),
        label: `${draftServico.fornecedor.nome} — ${draftServico.servico.nome} (${MODELO_PRECIFICACAO_LABELS[modelo]})`,
        servicoFornecedorId: draftServico.id,
        categoriaProdutoId: categoriaId,
        modeloPrecificacao: modelo,
        servicoEngajamentoId: engajamentoExistente.id,
        precoUnitario: null,
        tempoMinutos: null,
        custoPorMinutoAplicado: null,
        valorCalculado: estimativa,
        provisorio: true,
      };
      setServicosLinhas((prev) => [...prev, linha]);
      setDraftServicoFornecedorId(null);
      return;
    }

    const precoUnitario = modelo === "tempo" ? null : Number(draftPrecoUnitario) || 0;
    const tempoMinutos = modelo === "tempo" ? Number(draftTempoMinutos) || 0 : null;
    const custoPorMinutoAplicado = modelo === "tempo" ? draftServico.custo_por_minuto : null;
    const valorCalculado =
      modelo === "tempo" ? (tempoMinutos ?? 0) * (custoPorMinutoAplicado ?? 0) : precoUnitario ?? 0;

    const linha: ServicoLinhaUI = {
      key: crypto.randomUUID(),
      label: `${draftServico.fornecedor.nome} — ${draftServico.servico.nome} (${MODELO_PRECIFICACAO_LABELS[modelo]})`,
      servicoFornecedorId: draftServico.id,
      categoriaProdutoId: categoriaId,
      modeloPrecificacao: modelo,
      servicoEngajamentoId: null,
      precoUnitario,
      tempoMinutos,
      custoPorMinutoAplicado,
      valorCalculado,
      provisorio: false,
    };
    setServicosLinhas((prev) => [...prev, linha]);
    setDraftServicoFornecedorId(null);
    setDraftPrecoUnitario("");
    setDraftTempoMinutos("");
  }

  function addInsumoLinha() {
    if (!compraVigente || !draftFornecedorId || !draftMaterialId) return;
    const consumo = Number(draftConsumo) || 0;
    const desperdicio = Number(draftDesperdicio) || 0;
    if (consumo <= 0) return;
    const material = materiais.find((m) => m.id === draftMaterialId);
    const fornecedor = fornecedores.find((f) => f.id === draftFornecedorId);
    const custoCalculado = custoInsumoPorPeca({
      consumoQuantidade: consumo,
      desperdicioPct: desperdicio,
      precoUnitarioAplicado: compraVigente.preco_unitario_liquido ?? 0,
    });
    const linha: InsumoLinhaUI = {
      key: crypto.randomUUID(),
      label: `${material ? labelMaterial(material) : ""} — ${fornecedor?.nome}`,
      materialId: draftMaterialId,
      fornecedorId: draftFornecedorId,
      compraInsumoId: compraVigente.id!,
      consumoQuantidade: consumo,
      desperdicioPct: desperdicio,
      precoUnitarioAplicado: compraVigente.preco_unitario_liquido ?? 0,
      custoCalculado,
    };
    setInsumosLinhas((prev) => [...prev, linha]);
    setDraftFornecedorId(null);
    setDraftMaterialId(null);
    setDraftConsumo("");
    setDraftDesperdicio("0");
  }

  /** Remove a linha e devolve os valores para o formulário de cima, para corrigir e adicionar de novo. */
  function iniciarEdicaoServico(l: ServicoLinhaUI) {
    setServicosLinhas((prev) => prev.filter((x) => x.key !== l.key));
    setDraftServicoFornecedorId(l.servicoFornecedorId);
    setDraftTempoMinutos(l.tempoMinutos != null ? String(l.tempoMinutos) : "");
    setDraftPrecoUnitario(l.precoUnitario != null ? String(l.precoUnitario) : "");
  }

  function iniciarEdicaoInsumo(l: InsumoLinhaUI) {
    setInsumosLinhas((prev) => prev.filter((x) => x.key !== l.key));
    setDraftFornecedorId(l.fornecedorId);
    setDraftMaterialId(l.materialId);
    setDraftConsumo(String(l.consumoQuantidade));
    setDraftDesperdicio(String(l.desperdicioPct));
  }

  async function handleSalvarProduto() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Dê um nome ao produto.");
      return;
    }
    if (quantidadeProduzidaNum <= 0) {
      setErro("Informe a quantidade que será produzida.");
      return;
    }
    if (servicosLinhas.length === 0 && insumosLinhas.length === 0) {
      setErro("Adicione ao menos um serviço ou insumo.");
      return;
    }
    const categoriaNome = categorias.find((c) => c.id === categoriaId)?.nome ?? null;
    const criado = await createProduto.mutateAsync({
      nome: nome.trim(),
      codigo: codigo.trim() || null,
      cor: cor.trim() || null,
      descricao: descricaoProduto(categoriaNome, nome.trim(), cor.trim() || null),
      categoriaProdutoId: categoriaId,
      colecaoId,
      quantidadeProduzida: quantidadeProduzidaNum,
      custoTotalUnitario: custoTotal,
      custoProducaoInternaUnitario,
      servicos: servicosLinhas,
      insumos: insumosLinhas,
    });
    setProdutoSalvoCodigo(criado.codigo);
    setSalvo(true);
  }

  if (salvo) {
    return (
      <Card className="max-w-md">
        <h2 className="text-lg font-semibold mb-2">Produto salvo!</h2>
        {produtoSalvoCodigo && (
          <p className="text-sm text-muted-foreground mb-2">
            Código: <strong>{produtoSalvoCodigo}</strong>
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-4">
          {servicosLinhas.some((l) => l.provisorio)
            ? "O custo foi salvo como provisório porque este produto usa serviço(s) por coleção ou peça desenvolvida — o valor definitivo só é travado quando você 'fechar' a coleção, na tela de Coleções."
            : "O custo foi congelado no momento do salvamento."}{" "}
          Aprove ou descarte na tela de Coleções.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/colecoes")}>Ver coleções</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Cadastrar outro produto
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="pb-16">
      <div className="flex items-start justify-between gap-4">
        <PageTitle title="Novo produto" subtitle="Monte o custo do produto a partir dos serviços e insumos já cadastrados." />
        <Button variant="ghost" onClick={tour.abrir}>
          Tour desta tela
        </Button>
      </div>
      <Tour steps={TOUR_STEPS} aberto={tour.aberto} onFechar={tour.fechar} />

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome do produto">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Camisa Linho Off-White" />
          </Field>
          <Field label="Categoria">
            <Combobox
              options={categorias.map((c) => ({ id: c.id, label: c.nome }))}
              value={categoriaId}
              onChange={setCategoriaId}
              onCreate={async (nome) => (await createCategoria.mutateAsync(nome)).id}
              placeholder="Selecionar ou criar categoria..."
            />
          </Field>
          <Field
            label="Código"
            hint={
              <InfoTooltip>
                Opcional. Deixe em branco para o sistema gerar um código automático (ex: PRD-0001), ou digite o código
                que você já usa no seu ERP/planilha.
              </InfoTooltip>
            }
          >
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Gerado automaticamente" />
          </Field>
          <Field
            label="Cor/Característica"
            hint={<InfoTooltip>Opcional. Ex: "Azul-marinho" — entra na descrição automática do produto, junto com a categoria e o nome.</InfoTooltip>}
          >
            <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="ex: Azul-marinho" />
          </Field>

          <Field label="Coleção" data-tour="produto-colecao">
            {!novaColecao ? (
              <div className="flex gap-2">
                <Select value={colecaoId ?? ""} onChange={(e) => setColecaoId(e.target.value || null)} className="flex-1">
                  <option value="">Sem coleção</option>
                  {colecoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="secondary" onClick={() => setNovaColecao(true)}>
                  + Nova
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                <Input placeholder="Nome da coleção" value={colecaoNome} onChange={(e) => setColecaoNome(e.target.value)} />
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
          <Field label="Quantidade a ser produzida">
            <Input
              type="number"
              min="0"
              step="1"
              value={quantidadeProduzida}
              onChange={(e) => setQuantidadeProduzida(e.target.value)}
              placeholder="ex: 200"
            />
          </Field>
        </div>
      </Card>

      {/* Insumos */}
      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Insumos / matérias-primas</h2>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end mb-4">
          <Field label="Material">
            <Combobox
              options={materiais.map((m) => ({ id: m.id, label: labelMaterial(m) }))}
              value={draftMaterialId}
              onChange={(v) => {
                setDraftMaterialId(v);
                setDraftFornecedorId(null);
              }}
              placeholder="Selecionar material..."
            />
          </Field>
          <Field
            label="Fornecedor"
            hint={<InfoTooltip>Só mostra fornecedores que já têm compra registrada deste material na tela de Insumos.</InfoTooltip>}
          >
            <Combobox
              options={fornecedoresDoMaterial.map((f) => ({ id: f.id, label: f.nome }))}
              value={draftFornecedorId}
              onChange={setDraftFornecedorId}
              disabled={!draftMaterialId}
              placeholder={draftMaterialId ? "Selecionar fornecedor..." : "Selecione o material primeiro"}
            />
          </Field>
          <Field
            label={`Consumo por peça${compraVigente?.unidade_compra === "peca" ? " (peças)" : " (m)"}`}
            hint={
              <InfoTooltip>
                {compraVigente?.unidade_compra === "peca"
                  ? "Quantas peças desse aviamento (zíper, botão...) cada unidade do produto usa — o sistema já sabe o preço por peça, calculado na tela de Insumos."
                  : "Em metros lineares, independente de como o insumo foi comprado (metro, peso ou rolo) — o sistema já converteu o preço para R$/metro na tela de Insumos."}
              </InfoTooltip>
            }
          >
            <Input type="number" min="0" step="any" value={draftConsumo} onChange={(e) => setDraftConsumo(e.target.value)} />
          </Field>
          <Field
            label="% desperdício"
            hint={
              <InfoTooltip>
                Quebra inevitável no corte e enfesto — geralmente entre 5% e 15%. O custo real soma esse percentual ao
                consumo líquido do molde.
              </InfoTooltip>
            }
          >
            <Input type="number" min="0" step="any" value={draftDesperdicio} onChange={(e) => setDraftDesperdicio(e.target.value)} />
          </Field>
          <Button type="button" variant="secondary" onClick={addInsumoLinha} disabled={!compraVigente}>
            Adicionar
          </Button>
        </div>
        {draftFornecedorId && draftMaterialId && !compraVigente && (
          <div className="mb-4 text-sm text-destructive">
            Não há compra registrada para este fornecedor + material. Cadastre uma compra na tela de Insumos primeiro.
          </div>
        )}
        {compraVigente && (
          <div className="mb-4 text-sm text-muted-foreground">
            Preço unitário vigente (líquido de imposto): <strong>{formatBRL(compraVigente.preco_unitario_liquido)}</strong>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Material / fornecedor</th>
              <th className="py-2 pr-4">Consumo</th>
              <th className="py-2 pr-4">Desperdício</th>
              <th className="py-2 pr-4">Preço unitário</th>
              <th className="py-2 pr-4">Custo por peça</th>
              <th className="py-2 pr-4">Estoque</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {insumosLinhas.map((l) => {
              const { falta, necessario, disponivel } = checarEstoque(l.materialId);
              return (
                <tr key={l.key} className="border-b border-border/60">
                  <td className="py-2 pr-4">{l.label}</td>
                  <td className="py-2 pr-4">{formatNumber(l.consumoQuantidade)}</td>
                  <td className="py-2 pr-4">{formatNumber(l.desperdicioPct)}%</td>
                  <td className="py-2 pr-4">{formatBRL(l.precoUnitarioAplicado)}</td>
                  <td className="py-2 pr-4">{formatBRL(custoInsumoPorPeca(l))}</td>
                  <td className="py-2 pr-4">
                    {falta ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">
                        Faltam {formatNumber(necessario - disponivel)}m
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{formatNumber(disponivel)}m disponível</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <button type="button" className="underline mr-3" onClick={() => iniciarEdicaoInsumo(l)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-destructive"
                      onClick={() => setInsumosLinhas((prev) => prev.filter((x) => x.key !== l.key))}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
            {insumosLinhas.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-muted-foreground">
                  Nenhum insumo adicionado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {insumosLinhas.some((l) => checarEstoque(l.materialId).falta) && (
          <div className="mt-4 rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
            Estoque insuficiente para a quantidade produzida em pelo menos um insumo. Você pode comprar mais do mesmo
            fornecedor, mas lotes diferentes costumam ter variação de cor/tonalidade — vale confirmar antes de
            aprovar este produto.
          </div>
        )}
      </Card>

      {/* Serviços */}
      <Card className="mb-6" data-tour="produto-servicos">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Serviços</h2>
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end mb-4">
          <Field label="Serviço (fornecedor)">
            <Combobox
              options={servicosFornecedor
                .filter((sf) => sf.modelo_precificacao !== "metro_corrido")
                .map((sf) => ({
                  id: sf.id,
                  label: `${sf.fornecedor.nome} — ${sf.servico.nome} (${MODELO_PRECIFICACAO_LABELS[sf.modelo_precificacao]})`,
                }))}
              value={draftServicoFornecedorId}
              onChange={(id) => {
                setDraftServicoFornecedorId(id);
                setDraftPrecoUnitario("");
                setDraftTempoMinutos("");
              }}
              placeholder="Selecionar serviço já cadastrado..."
            />
          </Field>

          {draftServico?.modelo_precificacao === "tempo" && (
            <Field label="Tempo (minutos)">
              <Input type="number" min="0" step="any" value={draftTempoMinutos} onChange={(e) => setDraftTempoMinutos(e.target.value)} />
            </Field>
          )}
          {draftServico?.modelo_precificacao === "peca_produzida" && (
            <Field label="Valor cobrado (R$)">
              <Input
                type="number"
                min="0"
                step="any"
                value={draftPrecoUnitario}
                onChange={(e) => setDraftPrecoUnitario(e.target.value)}
                placeholder={precoSugerido ? `Sugerido: ${formatBRL(precoSugerido.preco_unitario ?? precoSugerido.valor_calculado)}` : "Sem histórico ainda"}
              />
            </Field>
          )}
          {draftPooled && engajamentoExistente && (
            <div className="text-sm text-muted-foreground">
              Valor combinado: <strong>{formatBRL(engajamentoExistente.valor_total)}</strong>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            {draftServico?.modelo_precificacao === "tempo" && (
              <span>Custo/min: {formatBRL(draftServico.custo_por_minuto)}</span>
            )}
            {precoSugerido && draftServico?.modelo_precificacao === "peca_produzida" && (
              <button
                type="button"
                className="underline"
                onClick={() => setDraftPrecoUnitario(String(precoSugerido.preco_unitario ?? precoSugerido.valor_calculado))}
              >
                Usar último preço: {formatBRL(precoSugerido.preco_unitario ?? precoSugerido.valor_calculado)}
              </button>
            )}
            {draftPooled && estimativaEngajamentoExistente !== null && (
              <span>
                Estimativa por peça: {formatBRL(estimativaEngajamentoExistente)} <span className="italic">(provisório)</span>
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={addServicoLinha}
            disabled={!draftServico || draftColecaoConflita || (draftPooled && (!draftColecaoEfetivaId || !engajamentoExistente))}
          >
            Adicionar
          </Button>
        </div>
        {draftServico && draftColecaoConflita && (
          <div className="mb-4 text-sm text-destructive">
            Este serviço está preso à coleção "{draftServico.colecao?.nome}" — não pode ser usado num produto de outra
            coleção.
          </div>
        )}
        {draftPooled && !draftColecaoConflita && !colecaoId && (
          <div className="mb-4 text-sm text-destructive">
            Selecione a coleção do produto acima antes de adicionar este serviço.
          </div>
        )}
        {draftPooled && !draftColecaoConflita && colecaoId && !engajamentoExistente && (
          <div className="mb-4 text-sm text-destructive">
            Este serviço ainda não tem um valor combinado definido — edite o cadastro dele na tela de Serviços para
            informar o valor.
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Serviço</th>
              <th className="py-2 pr-4">Detalhe</th>
              <th className="py-2 pr-4">Custo por peça</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {servicosLinhas.map((l) => (
              <tr key={l.key} className="border-b border-border/60">
                <td className="py-2 pr-4">{l.label}</td>
                <td className="py-2 pr-4">
                  {l.modeloPrecificacao === "tempo"
                    ? `${formatNumber(l.tempoMinutos)} min × ${formatBRL(l.custoPorMinutoAplicado)}`
                    : l.provisorio
                      ? "Dividido entre as peças da coleção"
                      : formatBRL(l.precoUnitario)}
                </td>
                <td className="py-2 pr-4">
                  <span className="mr-2">{formatBRL(custoServicoPorPeca(l))}</span>
                  {l.provisorio && <Badge tone="muted">provisório</Badge>}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex gap-3">
                    <button type="button" className="underline" onClick={() => iniciarEdicaoServico(l)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-destructive"
                      onClick={() => setServicosLinhas((prev) => prev.filter((x) => x.key !== l.key))}
                    >
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {servicosLinhas.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                  Nenhum serviço adicionado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Produção interna */}
      {temProducaoInterna && (
        <Card className="mb-6" data-tour="produto-producao-interna">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Mão de obra própria</h2>
          {folhaMensalTotal === 0 || capacidadeMensal === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cadastre os cargos e a capacidade mensal da sua equipe em "Produção interna" no menu para poder incluir
              esse custo aqui.
            </p>
          ) : (
            <>
              <Checkbox
                label="Incluir custo de produção interna neste produto"
                checked={incluirProducaoInterna}
                onChange={setIncluirProducaoInterna}
                hint={
                  <InfoTooltip>
                    Diluí a folha mensal da sua equipe ({formatBRL(folhaMensalTotal)}) pela capacidade mensal (
                    {formatNumber(capacidadeMensal)} peças) considerando a quantidade que você vai produzir deste
                    produto. Ajuste em "Produção interna" se quiser mudar cargos ou capacidade.
                  </InfoTooltip>
                }
              />
              {incluirProducaoInterna && (
                <div className="mt-4 grid grid-cols-2 gap-4 items-end max-w-lg">
                  <Field
                    label="Ajuste de capacidade (%)"
                    hint={
                      <InfoTooltip>
                        Opcional. Positivo simula hora extra, negativo simula absenteísmo — só para este produto, não
                        altera a capacidade base salva.
                      </InfoTooltip>
                    }
                  >
                    <Input
                      type="number"
                      step="any"
                      value={ajusteProducaoInternaPct}
                      onChange={(e) => setAjusteProducaoInternaPct(e.target.value)}
                      placeholder="0"
                    />
                  </Field>
                  <div className="text-sm text-muted-foreground">
                    {quantidadeProduzidaNum > 0 && resultadoProducaoInterna.custoPorPeca !== null ? (
                      <>
                        Custo por peça: <strong>{formatBRL(resultadoProducaoInterna.custoPorPeca)}</strong> (
                        {formatNumber(resultadoProducaoInterna.mesesNecessarios)} meses de produção)
                      </>
                    ) : (
                      "Informe a quantidade a ser produzida acima."
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      <Card className="sticky bottom-4 flex items-center justify-between shadow-lg" data-tour="produto-total">
        <div>
          <div className="text-sm text-muted-foreground">Custo unitário estimado</div>
          <div className="text-2xl font-semibold">{formatBRL(custoTotal)}</div>
        </div>
        <div className="flex items-center gap-3">
          {erro && <span className="text-sm text-destructive">{erro}</span>}
          <Button onClick={handleSalvarProduto} disabled={createProduto.isPending}>
            {createProduto.isPending ? "Salvando..." : "Salvar produto"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
