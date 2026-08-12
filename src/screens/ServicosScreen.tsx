import { useState } from "react";
import { Combobox } from "@/components/Combobox";
import { ComboboxMulti } from "@/components/ComboboxMulti";
import { ImportModal, type ResultadoImport } from "@/components/ImportModal";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Tour, useTourAutoShow, type TourStep } from "@/components/Tour";
import { Badge, Button, Card, Checkbox, Field, Input, PageTitle, Select } from "@/components/ui";
import {
  useAplicarBeneficiamento,
  useBeneficiamentosPorServico,
  useCategorias,
  useColecoes,
  useCreateCategoria,
  useCreateFornecedor,
  useCreateMaterial,
  useCreateServico,
  useCreateServicoFornecedor,
  useFornecedores,
  useMateriais,
  useServicos,
  useServicosFornecedor,
  useUltimaCompraPorFornecedorMaterial,
  type ModeloPrecificacaoServico,
} from "@/hooks/useData";
import { findOrCreateCategoria, findOrCreateFornecedor, findOrCreateServico, parseNumeroPtBr } from "@/lib/importHelpers";
import { MODELO_SERVICOS } from "@/lib/importFields";
import { formatBRL, formatDate, formatNumber, MODELO_PRECIFICACAO_EXPLICACAO, MODELO_PRECIFICACAO_LABELS } from "@/lib/format";

const MODELOS = Object.entries(MODELO_PRECIFICACAO_LABELS) as [ModeloPrecificacaoServico, string][];
const MODELOS_VALIDOS = new Set(["colecao", "peca_desenvolvida", "peca_produzida", "tempo"]);

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "servicos-modelo",
    title: "Escolha o modelo de precificação com cuidado",
    texto:
      "É a decisão mais importante desta tela: 'por coleção' e 'por peça desenvolvida' dividem um valor combinado entre várias peças; 'por peça produzida' cobra o valor cheio em cada peça; 'por tempo' multiplica minutos pelo custo por minuto.",
  },
  {
    targetId: "servicos-colecao",
    title: "Serviços 'por coleção' ficam presos a uma coleção",
    texto: "Ao escolher esse modelo, você define de uma vez qual coleção ele atende — não dá para reaproveitar em outra coleção depois.",
  },
  {
    targetId: "servicos-beneficiamento",
    title: "Beneficiamento é diferente de um serviço comum",
    texto:
      "Marque aqui quando o fornecedor transforma um insumo seu em outro (ex: estamparia). Depois de cadastrar, use o botão 'Registrar beneficiamento' na lista abaixo — cada lote enviado para beneficiar é um registro separado.",
  },
  {
    targetId: "servicos-tabela",
    title: "Serviços já cadastrados",
    texto: "Aqui você vê o modelo e a coleção de cada serviço, e acessa o registro de beneficiamento quando aplicável.",
  },
];

export function ServicosScreen() {
  const { data: fornecedores = [] } = useFornecedores();
  const { data: servicos = [] } = useServicos();
  const { data: categorias = [] } = useCategorias();
  const { data: colecoes = [] } = useColecoes();
  const { data: servicosFornecedor = [] } = useServicosFornecedor();
  const createFornecedor = useCreateFornecedor();
  const createServico = useCreateServico();
  const createCategoria = useCreateCategoria();
  const createServicoFornecedor = useCreateServicoFornecedor();
  const [importAberto, setImportAberto] = useState(false);
  const [beneficiarId, setBeneficiarId] = useState<string | null>(null);
  const tour = useTourAutoShow("servicos");

  async function handleImportar(linhas: Record<string, string>[]): Promise<ResultadoImport> {
    let sucesso = 0;
    const erros: ResultadoImport["erros"] = [];
    for (let i = 0; i < linhas.length; i++) {
      const row = linhas[i];
      try {
        if (!row.fornecedor?.trim() || !row.servico?.trim()) throw new Error("fornecedor ou serviço vazio");
        const modeloRow = row.modelo_precificacao?.trim().toLowerCase();
        if (!MODELOS_VALIDOS.has(modeloRow))
          throw new Error("modelo de precificação inválido (use colecao, peca_desenvolvida, peca_produzida ou tempo)");
        const custoPorMinuto = modeloRow === "tempo" ? parseNumeroPtBr(row.custo_por_minuto) : null;
        if (modeloRow === "tempo" && !(Number(custoPorMinuto) > 0)) throw new Error("custo por minuto obrigatório para o modelo 'tempo'");
        if (modeloRow === "colecao") throw new Error("modelo 'colecao' não pode ser importado em lote — cadastre manualmente para escolher a coleção");

        const fornecedorId = await findOrCreateFornecedor(row.fornecedor);
        const servicoId = await findOrCreateServico(row.servico);
        const nomesCategorias = (row.categorias ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const categoriaIdsRow: string[] = [];
        for (const nome of nomesCategorias) categoriaIdsRow.push(await findOrCreateCategoria(nome));
        const beneficiamentoRow = ["sim", "s", "yes", "true"].includes((row.beneficiamento ?? "").trim().toLowerCase());

        await createServicoFornecedor.mutateAsync({
          fornecedorId,
          servicoId,
          modeloPrecificacao: modeloRow as ModeloPrecificacaoServico,
          custoPorMinuto,
          colecaoId: null,
          beneficiamento: beneficiamentoRow,
          categoriaIds: categoriaIdsRow,
        });
        sucesso++;
      } catch (err) {
        erros.push({ linha: i + 2, motivo: err instanceof Error ? err.message : String(err) });
      }
    }
    return { sucesso, erros };
  }

  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [categoriaIds, setCategoriaIds] = useState<string[]>([]);
  const [modelo, setModelo] = useState<ModeloPrecificacaoServico>("peca_desenvolvida");
  const [colecaoId, setColecaoId] = useState<string | null>(null);
  const [custoPorMinuto, setCustoPorMinuto] = useState("");
  const [beneficiamento, setBeneficiamento] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!fornecedorId || !servicoId) {
      setErro("Selecione ou crie um fornecedor e um tipo de serviço.");
      return;
    }
    if (modelo === "tempo" && (!custoPorMinuto || Number(custoPorMinuto) <= 0)) {
      setErro("Informe o custo por minuto de produção.");
      return;
    }
    if (modelo === "colecao" && !colecaoId) {
      setErro("Selecione a coleção para este serviço 'por coleção'.");
      return;
    }
    await createServicoFornecedor.mutateAsync({
      fornecedorId,
      servicoId,
      modeloPrecificacao: modelo,
      custoPorMinuto: modelo === "tempo" ? Number(custoPorMinuto) : null,
      colecaoId: modelo === "colecao" ? colecaoId : null,
      beneficiamento,
      categoriaIds,
    });
    setCategoriaIds([]);
    setCustoPorMinuto("");
    setColecaoId(null);
    setBeneficiamento(false);
  }

  const beneficiarServico = servicosFornecedor.find((sf) => sf.id === beneficiarId) ?? null;

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

      <Card className="mb-8">
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
          <Field label="Tipo de serviço">
            <Combobox
              options={servicos.map((s) => ({ id: s.id, label: `${s.nome}${s.codigo ? ` (${s.codigo})` : ""}` }))}
              value={servicoId}
              onChange={setServicoId}
              onCreate={async (nome) => (await createServico.mutateAsync(nome)).id}
              placeholder="Selecionar ou cadastrar serviço..."
            />
          </Field>

          <Field
            label="Categorias de produto atendidas"
            hint={
              <InfoTooltip>
                Categorias como "Camisa" ou "Calça" — as mesmas usadas na tela de produto. Digite para selecionar uma já
                existente ou criar uma nova, sem sair desta tela.
              </InfoTooltip>
            }
          >
            <ComboboxMulti
              options={categorias.map((c) => ({ id: c.id, label: c.nome }))}
              values={categoriaIds}
              onChange={setCategoriaIds}
              onCreate={async (nome) => (await createCategoria.mutateAsync(nome)).id}
              placeholder="Selecionar ou criar categorias..."
            />
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
              </InfoTooltip>
            }
          >
            <Select value={modelo} onChange={(e) => setModelo(e.target.value as ModeloPrecificacaoServico)}>
              {MODELOS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {modelo === "tempo" && (
            <Field label="Custo por minuto de produção (R$)">
              <Input type="number" min="0" step="any" value={custoPorMinuto} onChange={(e) => setCustoPorMinuto(e.target.value)} />
            </Field>
          )}
          {modelo === "colecao" && (
            <Field
              label="Coleção"
              data-tour="servicos-colecao"
              hint={
                <InfoTooltip>
                  Esse serviço fica preso a esta coleção — ao lançar produtos, o valor combinado será dividido entre
                  todas as peças produzidas nela.
                </InfoTooltip>
              }
            >
              <Select value={colecaoId ?? ""} onChange={(e) => setColecaoId(e.target.value || null)}>
                <option value="">Selecionar coleção...</option>
                {colecoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {(modelo === "peca_desenvolvida" || modelo === "peca_produzida") && (
            <div className="flex items-end text-sm text-muted-foreground">
              {modelo === "peca_desenvolvida"
                ? "O valor combinado com o fornecedor é lançado por coleção na tela de produto e dividido entre as peças que usarem este serviço."
                : "O preço é o último valor já pago a este fornecedor, por categoria — lançado na tela de produto, sem diluição."}
            </div>
          )}

          <div className="col-span-2" data-tour="servicos-beneficiamento">
            <Checkbox
              label="Este serviço é um beneficiamento (transforma um insumo em outro)"
              checked={beneficiamento}
              onChange={setBeneficiamento}
              hint={
                <InfoTooltip>
                  Marque quando o fornecedor recebe uma matéria-prima sua e devolve outra — ex: estamparia (tecido cru
                  vira tecido estampado), tingimento, lavanderia. Depois de cadastrar, use a seção "Registrar
                  beneficiamento" abaixo para dar baixa no material de origem e criar o material resultante já com o
                  custo somado (matéria-prima + taxa do serviço), atualizando o estoque automaticamente.
                </InfoTooltip>
              }
            />
          </div>

          {erro && <div className="col-span-2 text-sm text-destructive">{erro}</div>}

          <div className="col-span-2">
            <Button type="submit" disabled={createServicoFornecedor.isPending}>
              {createServicoFornecedor.isPending ? "Salvando..." : "Cadastrar serviço"}
            </Button>
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
              {servicosFornecedor.map((sf) => (
                <tr key={sf.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">{sf.fornecedor?.nome}</td>
                  <td className="py-2 pr-4">
                    {sf.servico?.nome}
                    {sf.beneficiamento && (
                      <span className="ml-2">
                        <Badge tone="muted">Beneficiamento</Badge>
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {sf.categorias.map((c) => (
                        <Badge key={c.id}>{c.nome}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-4">{MODELO_PRECIFICACAO_LABELS[sf.modelo_precificacao]}</td>
                  <td className="py-2 pr-4">{sf.colecao?.nome ?? "—"}</td>
                  <td className="py-2 pr-4">{sf.custo_por_minuto ? formatBRL(sf.custo_por_minuto) : "—"}</td>
                  <td className="py-2 pr-4">
                    {sf.beneficiamento && (
                      <button type="button" className="underline text-sm" onClick={() => setBeneficiarId(sf.id)}>
                        Registrar beneficiamento
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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

      {beneficiarServico && (
        <BeneficiamentoModal servico={beneficiarServico} onClose={() => setBeneficiarId(null)} />
      )}
    </div>
  );
}

function BeneficiamentoModal({
  servico,
  onClose,
}: {
  servico: NonNullable<ReturnType<typeof useServicosFornecedor>["data"]>[number];
  onClose: () => void;
}) {
  const { data: materiais = [] } = useMateriais();
  const createMaterial = useCreateMaterial();
  const { data: historico = [] } = useBeneficiamentosPorServico(servico.id);
  const aplicar = useAplicarBeneficiamento();

  const [materialOrigemId, setMaterialOrigemId] = useState<string | null>(null);
  const [materialResultanteId, setMaterialResultanteId] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [custoBeneficiamento, setCustoBeneficiamento] = useState("");
  const [dataCompra, setDataCompra] = useState(() => new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const { data: compraOrigem } = useUltimaCompraPorFornecedorMaterial(servico.fornecedor_id, materialOrigemId);

  const quantidadeNum = Number(quantidade) || 0;
  const custoBeneficiamentoNum = Number(custoBeneficiamento) || 0;
  const custoOrigemUnitario = compraOrigem?.preco_unitario_liquido ?? 0;
  const custoUnitarioResultante =
    quantidadeNum > 0 ? (custoOrigemUnitario * quantidadeNum + custoBeneficiamentoNum) / quantidadeNum : 0;

  async function handleAplicar() {
    setErro(null);
    if (!materialOrigemId || !materialResultanteId) {
      setErro("Selecione o material de origem e o material resultante.");
      return;
    }
    if (!compraOrigem) {
      setErro(`Não há compra registrada de "${materiais.find((m) => m.id === materialOrigemId)?.nome}" com o fornecedor ${servico.fornecedor.nome}.`);
      return;
    }
    if (quantidadeNum <= 0) {
      setErro("Informe a quantidade beneficiada.");
      return;
    }
    await aplicar.mutateAsync({
      servicoFornecedorId: servico.id,
      fornecedorId: servico.fornecedor_id,
      materialOrigemId,
      compraInsumoOrigemId: compraOrigem.id,
      materialResultanteId,
      quantidadeBeneficiada: quantidadeNum,
      custoOrigemUnitario,
      custoBeneficiamento: custoBeneficiamentoNum,
      regimeTributario: compraOrigem.regime_tributario ?? "simples_nacional",
      dataCompra,
    });
    setSucesso(true);
    setMaterialOrigemId(null);
    setMaterialResultanteId(null);
    setQuantidade("");
    setCustoBeneficiamento("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Registrar beneficiamento</h2>
              <p className="text-sm text-muted-foreground">
                {servico.fornecedor.nome} — {servico.servico.nome}
              </p>
            </div>
            <button type="button" className="text-muted-foreground" onClick={onClose}>
              Fechar
            </button>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Escolha a matéria-prima que sai do estoque (origem) e a matéria-prima que entra (resultante). O sistema
            calcula o custo unitário do material resultante somando o custo da origem + a taxa cobrada pelo
            fornecedor, dividido pela quantidade — e já ajusta os dois estoques automaticamente.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Material de origem (o que sai do estoque)">
              <Combobox
                options={materiais.map((m) => ({ id: m.id, label: m.nome }))}
                value={materialOrigemId}
                onChange={setMaterialOrigemId}
                placeholder="ex: Tactel branco"
              />
            </Field>
            <Field label="Material resultante (o que entra no estoque)">
              <Combobox
                options={materiais.map((m) => ({ id: m.id, label: m.nome }))}
                value={materialResultanteId}
                onChange={setMaterialResultanteId}
                onCreate={async (nome) => (await createMaterial.mutateAsync(nome)).id}
                placeholder="ex: Tactel dinossauro (criar novo)"
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
              <Input type="number" min="0" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </Field>
            <Field label="Taxa de beneficiamento (R$ total)">
              <Input
                type="number"
                min="0"
                step="any"
                value={custoBeneficiamento}
                onChange={(e) => setCustoBeneficiamento(e.target.value)}
                placeholder="Valor cobrado pelo fornecedor"
              />
            </Field>
            <Field label="Data">
              <Input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
            </Field>
          </div>

          {materialOrigemId && !compraOrigem && (
            <div className="mt-4 text-sm text-destructive">
              Não há compra de "{materiais.find((m) => m.id === materialOrigemId)?.nome}" registrada com{" "}
              {servico.fornecedor.nome} na tela de Insumos. Cadastre essa compra primeiro (o fornecedor lá pode ser
              qualquer um — o que importa é ter o preço de custo do material de origem).
            </div>
          )}
          {compraOrigem && quantidadeNum > 0 && (
            <div className="mt-4 rounded-md bg-muted px-4 py-3 text-sm">
              Custo da origem: {formatNumber(quantidadeNum)}m × {formatBRL(custoOrigemUnitario)} ={" "}
              {formatBRL(custoOrigemUnitario * quantidadeNum)} + taxa {formatBRL(custoBeneficiamentoNum)} ={" "}
              <strong>{formatBRL(custoOrigemUnitario * quantidadeNum + custoBeneficiamentoNum)}</strong> total → custo
              unitário do resultante: <strong>{formatBRL(custoUnitarioResultante)}/m</strong>
            </div>
          )}

          {erro && <div className="mt-4 text-sm text-destructive">{erro}</div>}
          {sucesso && <div className="mt-4 text-sm text-success">Beneficiamento registrado e estoque atualizado.</div>}

          <div className="mt-4 flex justify-end">
            <Button onClick={handleAplicar} disabled={aplicar.isPending}>
              {aplicar.isPending ? "Registrando..." : "Registrar beneficiamento"}
            </Button>
          </div>

          {historico.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Histórico</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-1 pr-4">Data</th>
                    <th className="py-1 pr-4">Origem</th>
                    <th className="py-1 pr-4">Resultante</th>
                    <th className="py-1 pr-4">Quantidade</th>
                    <th className="py-1 pr-4">Taxa</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((h) => (
                    <tr key={h.id} className="border-b border-border/60">
                      <td className="py-1 pr-4">{formatDate(h.criado_em)}</td>
                      <td className="py-1 pr-4">{h.material_origem.nome}</td>
                      <td className="py-1 pr-4">{h.material_resultante.nome}</td>
                      <td className="py-1 pr-4">{formatNumber(h.quantidade_beneficiada)}m</td>
                      <td className="py-1 pr-4">{formatBRL(h.custo_beneficiamento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
