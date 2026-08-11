import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Combobox } from "@/components/Combobox";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Button, Card, Field, Input, PageTitle, Select } from "@/components/ui";
import {
  useCategorias,
  useColecoes,
  useCreateCategoria,
  useCreateColecao,
  useCreateProdutoCompleto,
  useEstoqueAtual,
  useFornecedores,
  useMateriais,
  useServicosFornecedor,
  useUltimaCompraPorFornecedorMaterial,
  useUltimoPrecoServico,
  type NovaLinhaInsumoProduto,
  type NovaLinhaServicoProduto,
} from "@/hooks/useData";
import { custoInsumoPorPeca, custoServicoPorPeca, custoTotalProduto } from "@/engine/custo";
import { formatBRL, formatNumber, MODELO_PRECIFICACAO_LABELS } from "@/lib/format";

interface ServicoLinhaUI extends NovaLinhaServicoProduto {
  key: string;
  label: string;
}

interface InsumoLinhaUI extends NovaLinhaInsumoProduto {
  key: string;
  label: string;
  materialId: string;
}

export function NovoProdutoScreen() {
  const navigate = useNavigate();
  const { data: categorias = [] } = useCategorias();
  const { data: colecoes = [] } = useColecoes();
  const { data: servicosFornecedor = [] } = useServicosFornecedor();
  const { data: fornecedores = [] } = useFornecedores();
  const { data: materiais = [] } = useMateriais();
  const { data: estoqueAtual = [] } = useEstoqueAtual();
  const createColecao = useCreateColecao();
  const createCategoria = useCreateCategoria();
  const createProduto = useCreateProdutoCompleto();

  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [colecaoId, setColecaoId] = useState<string | null>(null);
  const [novaColecao, setNovaColecao] = useState(false);
  const [colecaoNome, setColecaoNome] = useState("");
  const [colecaoInicio, setColecaoInicio] = useState("");
  const [colecaoFim, setColecaoFim] = useState("");
  const [quantidadeProduzida, setQuantidadeProduzida] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const [servicosLinhas, setServicosLinhas] = useState<ServicoLinhaUI[]>([]);
  const [insumosLinhas, setInsumosLinhas] = useState<InsumoLinhaUI[]>([]);

  // --- draft: nova linha de serviço ---
  const [draftServicoFornecedorId, setDraftServicoFornecedorId] = useState<string | null>(null);
  const [draftPrecoUnitario, setDraftPrecoUnitario] = useState("");
  const [draftTempoMinutos, setDraftTempoMinutos] = useState("");

  const draftServico = servicosFornecedor.find((sf) => sf.id === draftServicoFornecedorId) ?? null;
  const { data: precoSugerido } = useUltimoPrecoServico(
    draftServicoFornecedorId,
    draftServico?.modelo_precificacao === "produto" ? categoriaId : null,
  );

  // --- draft: nova linha de insumo ---
  const [draftFornecedorId, setDraftFornecedorId] = useState<string | null>(null);
  const [draftMaterialId, setDraftMaterialId] = useState<string | null>(null);
  const [draftConsumo, setDraftConsumo] = useState("");
  const [draftDesperdicio, setDraftDesperdicio] = useState("0");
  const { data: compraVigente } = useUltimaCompraPorFornecedorMaterial(draftFornecedorId, draftMaterialId);

  const quantidadeProduzidaNum = Number(quantidadeProduzida) || 0;

  const custoTotal = useMemo(
    () => custoTotalProduto(servicosLinhas, insumosLinhas, quantidadeProduzidaNum),
    [servicosLinhas, insumosLinhas, quantidadeProduzidaNum],
  );

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
    const nova = await createColecao.mutateAsync({
      nome: colecaoNome.trim(),
      periodoInicio: colecaoInicio || null,
      periodoFim: colecaoFim || null,
    });
    setColecaoId(nova.id);
    setNovaColecao(false);
    setColecaoNome("");
    setColecaoInicio("");
    setColecaoFim("");
  }

  function addServicoLinha() {
    if (!draftServico) return;
    const modelo = draftServico.modelo_precificacao as "peca" | "tempo" | "produto";
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
      precoUnitario,
      tempoMinutos,
      custoPorMinutoAplicado,
      valorCalculado,
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
      label: `${material?.nome} — ${fornecedor?.nome}`,
      materialId: draftMaterialId,
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
    await createProduto.mutateAsync({
      nome: nome.trim(),
      categoriaProdutoId: categoriaId,
      colecaoId,
      quantidadeProduzida: quantidadeProduzidaNum,
      custoTotalUnitario: custoTotal,
      servicos: servicosLinhas,
      insumos: insumosLinhas,
    });
    setSalvo(true);
  }

  if (salvo) {
    return (
      <Card className="max-w-md">
        <h2 className="text-lg font-semibold mb-2">Produto salvo!</h2>
        <p className="text-sm text-muted-foreground mb-4">
          O custo foi congelado no momento do salvamento. Aprove ou descarte na tela de Coleções.
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
      <PageTitle title="Novo produto" subtitle="Monte o custo do produto a partir dos serviços e insumos já cadastrados." />

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

          <Field label="Coleção">
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
                  <Input type="date" value={colecaoInicio} onChange={(e) => setColecaoInicio(e.target.value)} />
                  <Input type="date" value={colecaoFim} onChange={(e) => setColecaoFim(e.target.value)} />
                </div>
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

      {/* Serviços */}
      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Serviços</h2>
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end mb-4">
          <Field label="Serviço (fornecedor)">
            <Combobox
              options={servicosFornecedor.map((sf) => ({
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

          {draftServico?.modelo_precificacao === "tempo" ? (
            <Field label="Tempo (minutos)">
              <Input type="number" min="0" step="any" value={draftTempoMinutos} onChange={(e) => setDraftTempoMinutos(e.target.value)} />
            </Field>
          ) : (
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

          <div className="text-sm text-muted-foreground">
            {draftServico?.modelo_precificacao === "tempo" && (
              <span>Custo/min: {formatBRL(draftServico.custo_por_minuto)}</span>
            )}
            {precoSugerido && draftServico?.modelo_precificacao !== "tempo" && (
              <button
                type="button"
                className="underline"
                onClick={() => setDraftPrecoUnitario(String(precoSugerido.preco_unitario ?? precoSugerido.valor_calculado))}
              >
                Usar último preço: {formatBRL(precoSugerido.preco_unitario ?? precoSugerido.valor_calculado)}
              </button>
            )}
          </div>

          <Button type="button" variant="secondary" onClick={addServicoLinha} disabled={!draftServico}>
            Adicionar
          </Button>
        </div>

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
                    : formatBRL(l.precoUnitario)}
                  {l.modeloPrecificacao === "peca" && (
                    <span className="text-muted-foreground"> (diluído por {formatNumber(quantidadeProduzidaNum)} peças)</span>
                  )}
                </td>
                <td className="py-2 pr-4">{formatBRL(custoServicoPorPeca(l, quantidadeProduzidaNum))}</td>
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() => setServicosLinhas((prev) => prev.filter((x) => x.key !== l.key))}
                  >
                    Remover
                  </button>
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

      {/* Insumos */}
      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Insumos / matérias-primas</h2>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end mb-4">
          <Field label="Material">
            <Combobox
              options={materiais.map((m) => ({ id: m.id, label: m.nome }))}
              value={draftMaterialId}
              onChange={setDraftMaterialId}
              placeholder="Selecionar material..."
            />
          </Field>
          <Field label="Fornecedor">
            <Combobox
              options={fornecedores.map((f) => ({ id: f.id, label: f.nome }))}
              value={draftFornecedorId}
              onChange={setDraftFornecedorId}
              placeholder="Selecionar fornecedor..."
            />
          </Field>
          <Field
            label="Consumo por peça"
            hint={
              <InfoTooltip>
                Sempre em metros lineares, independente de como o insumo foi comprado (metro, peso ou peça/rolo) — o
                sistema já converteu o preço para R$/metro na tela de Insumos.
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

      <Card className="sticky bottom-4 flex items-center justify-between shadow-lg">
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
