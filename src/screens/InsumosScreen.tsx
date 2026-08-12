import { useEffect, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { ImportModal, type ResultadoImport } from "@/components/ImportModal";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Tour, useTourAutoShow, type TourStep } from "@/components/Tour";
import { Button, Card, Field, Input, PageTitle, Select } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import {
  useComprasInsumo,
  useCreateCompraInsumo,
  useCreateFornecedor,
  useCreateMaterial,
  useDeleteCompraInsumo,
  useEstoqueAtual,
  useFornecedores,
  useMateriais,
  usePerfilNegocio,
  useUpdateCompraInsumo,
  useUpdateMaterial,
  type CompraInsumoCompleta,
} from "@/hooks/useData";
import { findOrCreateFornecedor, findOrCreateMaterial, parseNumeroPtBr } from "@/lib/importHelpers";
import { MODELO_INSUMOS } from "@/lib/importFields";
import { formatBRL, formatDate, formatNumber, labelMaterial, REGIME_LABELS, UNIDADE_COMPRA_LABELS, UNIDADE_COMPRA_SUFIXO } from "@/lib/format";

const REGIMES = Object.entries(REGIME_LABELS);
const REGIMES_VALIDOS = new Set(["simples_nacional", "lucro_presumido_real", "iva_dual_2027"]);
const UNIDADES = Object.entries(UNIDADE_COMPRA_LABELS);
const UNIDADES_VALIDAS = new Set(["metro", "peso_kg", "rolo", "peca"]);
const UNIDADES_COM_RENDIMENTO = new Set(["peso_kg", "rolo"]);

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "insumos-material",
    title: "Material e cor juntos identificam o insumo",
    texto:
      "Se você compra o mesmo tecido em cores diferentes, cadastre cada cor como um material separado — assim o estoque e o custo de cada cor ficam independentes. A cor aparece ao lado do nome em todas as telas.",
  },
  {
    targetId: "insumos-unidade",
    title: "Pack e unidade de compra definem a conversão",
    texto:
      "Metro e peso convertem para metros lineares; peça não converte (o Pack diz quantas peças por embalagem); rolo usa a metragem de cada rolo. Passe o mouse nos ícones de ajuda para ver exemplos.",
  },
  {
    targetId: "insumos-rendimento",
    title: "Compra por peso? Use o rendimento que o fornecedor já te dá",
    texto:
      "Quando você compra por peso, o fornecedor quase sempre informa quantos metros rendem 1 kg daquele tecido (ex: \"1kg rende 3 metros\"). Digite o peso comprado em kg normal e esse rendimento no campo ao lado — o sistema multiplica os dois e converte automaticamente para a metragem linear real, que é o que entra no seu estoque e no custo por metro.",
  },
  {
    targetId: "insumos-regime",
    title: "O regime tributário muda o custo líquido",
    texto: "Simples Nacional não gera crédito de imposto — o preço pago já é o custo real. Nos outros regimes, uma parte do imposto pago volta como crédito.",
  },
  {
    targetId: "insumos-tabela",
    title: "Compras registradas",
    texto: "Cada linha é um lote de compra. Use Editar para corrigir um erro de digitação ou Excluir para remover — o estoque é ajustado automaticamente.",
  },
];

export function InsumosScreen() {
  const { user } = useAuth();
  const { data: perfil } = usePerfilNegocio(user?.id);
  const { data: fornecedores = [] } = useFornecedores();
  const { data: materiais = [] } = useMateriais();
  const { data: compras = [] } = useComprasInsumo();
  const { data: estoqueAtual = [] } = useEstoqueAtual();
  const saldoPorMaterial = new Map(estoqueAtual.map((e) => [e.material_id, e]));
  const createFornecedor = useCreateFornecedor();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const createCompra = useCreateCompraInsumo();
  const updateCompra = useUpdateCompraInsumo();
  const deleteCompra = useDeleteCompraInsumo();
  const [importAberto, setImportAberto] = useState(false);
  const tour = useTourAutoShow("insumos");

  async function handleImportar(linhas: Record<string, string>[]): Promise<ResultadoImport> {
    let sucesso = 0;
    const erros: ResultadoImport["erros"] = [];
    for (let i = 0; i < linhas.length; i++) {
      const row = linhas[i];
      try {
        const pack = parseNumeroPtBr(row.pack);
        const quantidade = parseNumeroPtBr(row.quantidade_comprada);
        const preco = parseNumeroPtBr(row.preco_pago);
        if (!row.fornecedor?.trim() || !row.material?.trim()) throw new Error("fornecedor ou material vazio");
        if (!(pack > 0) || !(quantidade > 0) || isNaN(preco) || preco < 0) throw new Error("pack, quantidade ou preço inválido");

        const unidade = row.unidade_compra?.trim().toLowerCase() || "metro";
        const unidadeValida = UNIDADES_VALIDAS.has(unidade) ? unidade : "metro";
        const precisaRendimento = UNIDADES_COM_RENDIMENTO.has(unidadeValida);
        const fator = precisaRendimento ? parseNumeroPtBr(row.fator_metros_por_unidade) : 1;
        if (precisaRendimento && !(fator > 0)) {
          throw new Error("informe quantos metros equivalem a 1 " + (unidadeValida === "peso_kg" ? "kg" : "rolo"));
        }

        const fornecedorId = await findOrCreateFornecedor(row.fornecedor);
        const materialId = await findOrCreateMaterial(row.material, row.cor);
        const regime = row.regime_tributario?.trim().toLowerCase() ?? "";
        await createCompra.mutateAsync({
          fornecedorId,
          materialId,
          packQuantidade: pack,
          quantidadeComprada: quantidade,
          precoPago: preco,
          regimeTributario: REGIMES_VALIDOS.has(regime) ? regime : "simples_nacional",
          aliquotaCreditoPct: 0,
          dataCompra: row.data_compra?.trim() || new Date().toISOString().slice(0, 10),
          unidadeCompra: unidadeValida,
          fatorMetrosPorUnidade: fator,
        });
        sucesso++;
      } catch (err) {
        erros.push({ linha: i + 2, motivo: err instanceof Error ? err.message : String(err) });
      }
    }
    return { sucesso, erros };
  }

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [cor, setCor] = useState("");
  const [packQuantidade, setPackQuantidade] = useState("");
  const [unidadeCompra, setUnidadeCompra] = useState<"metro" | "peso_kg" | "rolo" | "peca">("metro");
  const [fatorMetros, setFatorMetros] = useState("");
  const [quantidadeComprada, setQuantidadeComprada] = useState("");
  const [precoPago, setPrecoPago] = useState("");
  const [regime, setRegime] = useState("simples_nacional");
  const [regimeInicializado, setRegimeInicializado] = useState(false);
  const [aliquota, setAliquota] = useState("0");
  const [dataCompra, setDataCompra] = useState(() => new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);

  // Pré-seleciona o regime tributário definido no onboarding, só na primeira carga.
  useEffect(() => {
    if (!regimeInicializado && perfil?.regime_tributario_padrao) {
      setRegime(perfil.regime_tributario_padrao);
      setRegimeInicializado(true);
    }
  }, [perfil, regimeInicializado]);

  function selecionarMaterial(id: string) {
    setMaterialId(id);
    setCor(materiais.find((m) => m.id === id)?.cor ?? "");
  }

  const packNum = Number(packQuantidade) || 0;
  const qtdNum = Number(quantidadeComprada) || 0;
  const precoNum = Number(precoPago) || 0;
  const precisaRendimento = UNIDADES_COM_RENDIMENTO.has(unidadeCompra);
  const fatorNum = precisaRendimento ? Number(fatorMetros) || 0 : 1;
  // Peça não converte para metros: o pack informa quantas peças tem cada embalagem comprada.
  const quantidadeConvertida = unidadeCompra === "peca" ? qtdNum * packNum : qtdNum * fatorNum;
  const precoUnitarioBruto = quantidadeConvertida > 0 ? precoNum / quantidadeConvertida : 0;
  const aliquotaNum = Number(aliquota) || 0;
  const precoUnitarioLiquido =
    regime === "simples_nacional" ? precoUnitarioBruto : precoUnitarioBruto * (1 - aliquotaNum / 100);
  const unidadePrecoLabel = unidadeCompra === "peca" ? "peça" : "metro";

  function dicaQuantidadeComprada() {
    if (unidadeCompra === "peca") {
      const exemploPack = packNum > 0 ? packNum : 50;
      return (
        <>
          Aqui é quantos <strong>packs</strong> você comprou, não o total de peças. Pack de {exemploPack} peças e você
          digita "1" → entram {exemploPack} peças no estoque. Digitou "{exemploPack}" → o sistema multiplica {exemploPack} ×{" "}
          {exemploPack} = {formatNumber(exemploPack * exemploPack)} peças.
        </>
      );
    }
    if (unidadeCompra === "rolo") {
      return (
        <>
          Aqui é quantos <strong>rolos</strong> você comprou. Digitou "2" → o sistema entende 2 rolos. A metragem de cada
          rolo entra no campo de rendimento, logo abaixo.
        </>
      );
    }
    if (unidadeCompra === "peso_kg") {
      return (
        <>
          Peso total do lote em quilos, direto da balança — <strong>não</strong> em metros. É o rendimento (campo
          abaixo) que converte esse peso para a metragem linear real que entra no estoque.
        </>
      );
    }
    return "Metragem linear total já comprada deste lote.";
  }

  function resetForm() {
    setFornecedorId(null);
    setMaterialId(null);
    setCor("");
    setPackQuantidade("");
    setUnidadeCompra("metro");
    setFatorMetros("");
    setQuantidadeComprada("");
    setPrecoPago("");
    setAliquota("0");
    setDataCompra(new Date().toISOString().slice(0, 10));
  }

  function iniciarEdicao(c: CompraInsumoCompleta) {
    setEditandoId(c.id);
    setFornecedorId(c.fornecedor_id);
    setMaterialId(c.material_id);
    setCor(c.material?.cor ?? "");
    setPackQuantidade(String(c.pack_quantidade));
    setUnidadeCompra(c.unidade_compra as any);
    setFatorMetros(String(c.fator_metros_por_unidade));
    setQuantidadeComprada(String(c.quantidade_comprada));
    setPrecoPago(String(c.preco_pago));
    setRegime(c.regime_tributario);
    setAliquota(String(c.aliquota_credito_pct));
    setDataCompra(c.data_compra);
    setErro(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    resetForm();
    setErro(null);
  }

  async function handleExcluir(id: string) {
    const ok = window.confirm("Excluir esta compra? O estoque é ajustado de volta. Essa ação não pode ser desfeita.");
    if (!ok) return;
    try {
      await deleteCompra.mutateAsync(id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível excluir esta compra.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!fornecedorId || !materialId) {
      setErro("Selecione ou crie um fornecedor e um material.");
      return;
    }
    if (!cor.trim()) {
      setErro("Informe a cor/característica do material.");
      return;
    }
    if (packNum <= 0 || qtdNum <= 0 || precoNum < 0) {
      setErro("Verifique o pack, a quantidade comprada e o preço pago.");
      return;
    }
    if (precisaRendimento && fatorNum <= 0) {
      setErro(
        unidadeCompra === "peso_kg" ? "Informe quantos metros equivalem a 1 kg (rendimento)." : "Informe a metragem linear de cada rolo.",
      );
      return;
    }

    const payload = {
      fornecedorId,
      materialId,
      packQuantidade: packNum,
      quantidadeComprada: qtdNum,
      precoPago: precoNum,
      regimeTributario: regime,
      aliquotaCreditoPct: aliquotaNum,
      dataCompra: dataCompra,
      unidadeCompra,
      fatorMetrosPorUnidade: fatorNum,
    };

    if (editandoId) {
      await updateCompra.mutateAsync({ id: editandoId, ...payload });
    } else {
      await createCompra.mutateAsync(payload);
    }

    const materialAtual = materiais.find((m) => m.id === materialId);
    if ((cor.trim() || null) !== (materialAtual?.cor ?? null)) {
      await updateMaterial.mutateAsync({ id: materialId, cor: cor.trim() || null });
    }

    if (editandoId) cancelarEdicao();
    else resetForm();
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title="Insumos e matérias-primas"
          subtitle="Cada compra registra um lote de preço próprio — o sistema sempre usa o último preço pago por fornecedor + material."
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
        <ImportModal modelo={MODELO_INSUMOS} onClose={() => setImportAberto(false)} onConfirmar={handleImportar} />
      )}

      <Card className="mb-8">
        {editandoId && (
          <div className="mb-4 flex items-center justify-between rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground">
            Editando compra já registrada.
            <button type="button" className="underline" onClick={cancelarEdicao}>
              Cancelar edição
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <Field label="Fornecedor">
            <Combobox
              options={fornecedores.map((f) => ({ id: f.id, label: `${f.nome}${f.codigo ? ` (${f.codigo})` : ""}` }))}
              value={fornecedorId}
              onChange={setFornecedorId}
              onCreate={async (nome) => (await createFornecedor.mutateAsync(nome)).id}
              placeholder="Selecionar ou cadastrar fornecedor..."
            />
          </Field>
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3" data-tour="insumos-material">
            <Field label="Material / insumo">
              <Combobox
                options={materiais.map((m) => ({ id: m.id, label: labelMaterial(m) }))}
                value={materialId}
                onChange={selecionarMaterial}
                onCreate={async (nome) => {
                  const criado = await createMaterial.mutateAsync(nome);
                  selecionarMaterial(criado.id);
                  return criado.id;
                }}
                placeholder="Selecionar ou cadastrar material..."
              />
            </Field>
            <Field
              label="Cor/Característica"
              hint={
                <InfoTooltip>
                  Obrigatório. Se você tem o mesmo material em cores ou variantes diferentes (ex: algodão cru verde e
                  cinza), cadastre cada uma separadamente — elas viram materiais distintos, com estoque e custo
                  próprios.
                </InfoTooltip>
              }
            >
              <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="ex: verde" />
            </Field>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3" data-tour="insumos-unidade">
            <Field
              label="Pack"
              hint={
                <InfoTooltip>
                  O volume mínimo que este fornecedor vende deste material — ex: rolo de 25m, cone de 4.000m, saco de
                  100 peças. Pode variar por fornecedor e por material, mesmo para o mesmo tipo de insumo.
                </InfoTooltip>
              }
            >
              <Input type="number" min="0" step="any" value={packQuantidade} onChange={(e) => setPackQuantidade(e.target.value)} placeholder="ex: 25" />
            </Field>
            <Field
              label="Unidade de compra"
              hint={
                <InfoTooltip>
                  <strong>Metro:</strong> tecido plano cortado do rolo.
                  <br />
                  <strong>Peso:</strong> malhas — você pesa e informa o rendimento que o fornecedor já te passa (quantos
                  metros rendem 1 kg); o sistema converte pra metro linear sozinho.
                  <br />
                  <strong>Rolo:</strong> rolo/peça fechada com metragem linear conhecida.
                  <br />
                  <strong>Peça:</strong> aviamentos contados por unidade (zíper, botão) — não converte para metros.
                </InfoTooltip>
              }
            >
              <Select value={unidadeCompra} onChange={(e) => setUnidadeCompra(e.target.value as any)}>
                {UNIDADES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Data da compra">
            <Input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
          </Field>

          <Field
            label={`Quantidade comprada${unidadeCompra !== "metro" ? ` (${UNIDADE_COMPRA_SUFIXO[unidadeCompra]})` : " (m)"}`}
            hint={<InfoTooltip>{dicaQuantidadeComprada()}</InfoTooltip>}
          >
            <Input type="number" min="0" step="any" value={quantidadeComprada} onChange={(e) => setQuantidadeComprada(e.target.value)} placeholder="ex: 100" />
          </Field>
          <Field label="Preço pago (total, R$)">
            <Input type="number" min="0" step="any" value={precoPago} onChange={(e) => setPrecoPago(e.target.value)} placeholder="ex: 350.00" />
          </Field>

          {precisaRendimento && (
            <Field
              label={unidadeCompra === "peso_kg" ? "Rendimento (quantos metros rende 1 kg)" : "Metros lineares por rolo"}
              data-tour="insumos-rendimento"
              hint={
                <InfoTooltip>
                  {unidadeCompra === "peso_kg"
                    ? "É o número que o próprio fornecedor costuma te passar — ex: \"1 kg rende 3 metros\". Depende da gramatura e espessura do tecido, então pode mudar de lote pra lote; some ao 'Quantidade comprada' pra virar a metragem real que entra no estoque."
                    : "Quantos metros lineares tem cada rolo fechado deste lote."}
                </InfoTooltip>
              }
            >
              <Input type="number" min="0" step="any" value={fatorMetros} onChange={(e) => setFatorMetros(e.target.value)} placeholder="ex: 30" />
            </Field>
          )}
          {unidadeCompra === "peca" && (
            <div className="flex items-end text-sm text-muted-foreground">
              <InfoTooltip>
                Peça não converte para metros. O Pack informa quantas peças tem cada embalagem — ex: pack de 100
                zíperes, comprou 1 pack → 100 peças entram no estoque.
              </InfoTooltip>
              <span className="ml-1.5">Sem conversão — o Pack já diz quantas peças por embalagem.</span>
            </div>
          )}
          <Field
            label="Regime tributário da compra"
            data-tour="insumos-regime"
            hint={
              <InfoTooltip>
                <strong>Simples Nacional:</strong> sem crédito, o preço pago já é o custo real.
                <br />
                <strong>Lucro Presumido/Real:</strong> hoje já dá para recuperar parte do imposto pago no insumo.
                <br />
                <strong>IVA Dual 2027:</strong> a partir da reforma tributária, crédito amplo sobre a compra.
              </InfoTooltip>
            }
          >
            <Select value={regime} onChange={(e) => setRegime(e.target.value)}>
              {REGIMES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {regime !== "simples_nacional" && (
            <Field label="Alíquota de crédito (%)">
              <Input type="number" min="0" max="100" step="any" value={aliquota} onChange={(e) => setAliquota(e.target.value)} />
            </Field>
          )}

          <div className="col-span-2 flex items-center justify-between rounded-md bg-muted px-4 py-3 text-sm">
            {unidadeCompra !== "metro" && (
              <span>
                Convertido: <strong>{formatNumber(quantidadeConvertida)} {unidadeCompra === "peca" ? "peças" : "m"}</strong>
              </span>
            )}
            <span>
              Preço unitário bruto: <strong>{formatBRL(precoUnitarioBruto)}/{unidadePrecoLabel}</strong>
            </span>
            <span>
              Preço unitário líquido de imposto: <strong>{formatBRL(precoUnitarioLiquido)}/{unidadePrecoLabel}</strong>
            </span>
          </div>

          {erro && <div className="col-span-2 text-sm text-destructive">{erro}</div>}

          <div className="col-span-2 flex gap-2">
            <Button type="submit" disabled={createCompra.isPending || updateCompra.isPending}>
              {createCompra.isPending || updateCompra.isPending ? "Salvando..." : editandoId ? "Salvar alterações" : "Registrar compra"}
            </Button>
            {editandoId && (
              <Button type="button" variant="ghost" onClick={cancelarEdicao}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card data-tour="insumos-tabela">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Compras registradas</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">Fornecedor</th>
                <th className="py-2 pr-4">Material</th>
                <th className="py-2 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Saldo atual
                    <InfoTooltip>
                      Estoque restante do material HOJE (soma de todos os lotes, já descontando o que foi usado em
                      beneficiamento ou produtos aprovados) — não é a mesma coisa que a "Qtd. comprada" desta linha,
                      que é o histórico da compra e nunca muda.
                    </InfoTooltip>
                  </span>
                </th>
                <th className="py-2 pr-4">Pack</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Qtd. comprada</th>
                <th className="py-2 pr-4">Qtd. convertida</th>
                <th className="py-2 pr-4">Preço pago</th>
                <th className="py-2 pr-4">Unitário bruto</th>
                <th className="py-2 pr-4">Unitário líquido</th>
                <th className="py-2 pr-4">Regime</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => (
                <tr key={c.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">{formatDate(c.data_compra)}</td>
                  <td className="py-2 pr-4">{c.fornecedor?.nome} <span className="text-muted-foreground">({c.fornecedor?.codigo})</span></td>
                  <td className="py-2 pr-4">{c.material ? labelMaterial(c.material) : ""} <span className="text-muted-foreground">({c.material?.codigo})</span></td>
                  <td className="py-2 pr-4">
                    {formatNumber(saldoPorMaterial.get(c.material_id)?.saldo_atual ?? 0)}{" "}
                    {saldoPorMaterial.get(c.material_id)?.unidadeEstoque ?? "m"}
                  </td>
                  <td className="py-2 pr-4">{formatNumber(c.pack_quantidade)}</td>
                  <td className="py-2 pr-4">{UNIDADE_COMPRA_LABELS[c.unidade_compra] ?? c.unidade_compra}</td>
                  <td className="py-2 pr-4">
                    {formatNumber(c.quantidade_comprada)} {UNIDADE_COMPRA_SUFIXO[c.unidade_compra] ?? ""}
                  </td>
                  <td className="py-2 pr-4">
                    {c.unidade_compra === "metro"
                      ? "—"
                      : `${formatNumber(c.quantidade_convertida)} ${c.unidade_compra === "peca" ? "peças" : "m"}`}
                  </td>
                  <td className="py-2 pr-4">{formatBRL(c.preco_pago)}</td>
                  <td className="py-2 pr-4">{formatBRL(c.preco_unitario_bruto)}</td>
                  <td className="py-2 pr-4">{formatBRL(c.preco_unitario_liquido)}</td>
                  <td className="py-2 pr-4">{REGIME_LABELS[c.regime_tributario]}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-3">
                      <button type="button" className="underline" onClick={() => iniciarEdicao(c)}>
                        Editar
                      </button>
                      <button type="button" className="text-destructive" onClick={() => handleExcluir(c.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {compras.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-6 text-center text-muted-foreground">
                    Nenhuma compra registrada ainda.
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
