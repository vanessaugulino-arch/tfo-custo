import { useState } from "react";
import { Combobox } from "@/components/Combobox";
import { ImportModal, type ResultadoImport } from "@/components/ImportModal";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Button, Card, Field, Input, PageTitle, Select } from "@/components/ui";
import {
  useComprasInsumo,
  useCreateCompraInsumo,
  useCreateFornecedor,
  useCreateMaterial,
  useFornecedores,
  useMateriais,
} from "@/hooks/useData";
import { findOrCreateFornecedor, findOrCreateMaterial, parseNumeroPtBr } from "@/lib/importHelpers";
import { MODELO_INSUMOS } from "@/lib/importFields";
import { formatBRL, formatDate, formatNumber, REGIME_LABELS } from "@/lib/format";

const REGIMES = Object.entries(REGIME_LABELS);
const REGIMES_VALIDOS = new Set(["simples_nacional", "lucro_presumido_real", "iva_dual_2027"]);

export function InsumosScreen() {
  const { data: fornecedores = [] } = useFornecedores();
  const { data: materiais = [] } = useMateriais();
  const { data: compras = [] } = useComprasInsumo();
  const createFornecedor = useCreateFornecedor();
  const createMaterial = useCreateMaterial();
  const createCompra = useCreateCompraInsumo();
  const [importAberto, setImportAberto] = useState(false);

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

        const fornecedorId = await findOrCreateFornecedor(row.fornecedor);
        const materialId = await findOrCreateMaterial(row.material);
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
        });
        sucesso++;
      } catch (err) {
        erros.push({ linha: i + 2, motivo: err instanceof Error ? err.message : String(err) });
      }
    }
    return { sucesso, erros };
  }

  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [packQuantidade, setPackQuantidade] = useState("");
  const [quantidadeComprada, setQuantidadeComprada] = useState("");
  const [precoPago, setPrecoPago] = useState("");
  const [regime, setRegime] = useState("simples_nacional");
  const [aliquota, setAliquota] = useState("0");
  const [dataCompra, setDataCompra] = useState(() => new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);

  const packNum = Number(packQuantidade) || 0;
  const qtdNum = Number(quantidadeComprada) || 0;
  const precoNum = Number(precoPago) || 0;
  const precoUnitarioBruto = qtdNum > 0 ? precoNum / qtdNum : 0;
  const aliquotaNum = Number(aliquota) || 0;
  const precoUnitarioLiquido =
    regime === "simples_nacional" ? precoUnitarioBruto : precoUnitarioBruto * (1 - aliquotaNum / 100);

  function resetForm() {
    setPackQuantidade("");
    setQuantidadeComprada("");
    setPrecoPago("");
    setAliquota("0");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!fornecedorId || !materialId) {
      setErro("Selecione ou crie um fornecedor e um material.");
      return;
    }
    if (packNum <= 0 || qtdNum <= 0 || precoNum < 0) {
      setErro("Verifique o pack, a quantidade comprada e o preço pago.");
      return;
    }
    await createCompra.mutateAsync({
      fornecedorId,
      materialId,
      packQuantidade: packNum,
      quantidadeComprada: qtdNum,
      precoPago: precoNum,
      regimeTributario: regime,
      aliquotaCreditoPct: aliquotaNum,
      dataCompra: dataCompra,
    });
    resetForm();
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title="Insumos e matérias-primas"
          subtitle="Cada compra registra um lote de preço próprio — o sistema sempre usa o último preço pago por fornecedor + material."
        />
        <Button variant="secondary" onClick={() => setImportAberto(true)}>
          Importar planilha
        </Button>
      </div>

      {importAberto && (
        <ImportModal modelo={MODELO_INSUMOS} onClose={() => setImportAberto(false)} onConfirmar={handleImportar} />
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
          <Field label="Material / insumo">
            <Combobox
              options={materiais.map((m) => ({ id: m.id, label: `${m.nome}${m.codigo ? ` (${m.codigo})` : ""}` }))}
              value={materialId}
              onChange={setMaterialId}
              onCreate={async (nome) => (await createMaterial.mutateAsync(nome)).id}
              placeholder="Selecionar ou cadastrar material..."
            />
          </Field>

          <Field
            label="Pack"
            hint={
              <InfoTooltip>
                O volume mínimo que este fornecedor vende deste material — ex: rolo de 25m, cone de 4.000m. Pode variar
                por fornecedor e por material, mesmo para o mesmo tipo de insumo.
              </InfoTooltip>
            }
          >
            <Input type="number" min="0" step="any" value={packQuantidade} onChange={(e) => setPackQuantidade(e.target.value)} placeholder="ex: 25" />
          </Field>
          <Field label="Data da compra">
            <Input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
          </Field>

          <Field label="Quantidade comprada">
            <Input type="number" min="0" step="any" value={quantidadeComprada} onChange={(e) => setQuantidadeComprada(e.target.value)} placeholder="ex: 100" />
          </Field>
          <Field label="Preço pago (total, R$)">
            <Input type="number" min="0" step="any" value={precoPago} onChange={(e) => setPrecoPago(e.target.value)} placeholder="ex: 350.00" />
          </Field>

          <Field
            label="Regime tributário da compra"
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
            <span>
              Preço unitário bruto: <strong>{formatBRL(precoUnitarioBruto)}</strong>
            </span>
            <span>
              Preço unitário líquido de imposto: <strong>{formatBRL(precoUnitarioLiquido)}</strong>
            </span>
          </div>

          {erro && <div className="col-span-2 text-sm text-destructive">{erro}</div>}

          <div className="col-span-2">
            <Button type="submit" disabled={createCompra.isPending}>
              {createCompra.isPending ? "Salvando..." : "Registrar compra"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Compras registradas</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">Fornecedor</th>
                <th className="py-2 pr-4">Material</th>
                <th className="py-2 pr-4">Pack</th>
                <th className="py-2 pr-4">Qtd. comprada</th>
                <th className="py-2 pr-4">Preço pago</th>
                <th className="py-2 pr-4">Unitário bruto</th>
                <th className="py-2 pr-4">Unitário líquido</th>
                <th className="py-2 pr-4">Regime</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => (
                <tr key={c.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">{formatDate(c.data_compra)}</td>
                  <td className="py-2 pr-4">{c.fornecedor?.nome} <span className="text-muted-foreground">({c.fornecedor?.codigo})</span></td>
                  <td className="py-2 pr-4">{c.material?.nome} <span className="text-muted-foreground">({c.material?.codigo})</span></td>
                  <td className="py-2 pr-4">{formatNumber(c.pack_quantidade)}</td>
                  <td className="py-2 pr-4">{formatNumber(c.quantidade_comprada)}</td>
                  <td className="py-2 pr-4">{formatBRL(c.preco_pago)}</td>
                  <td className="py-2 pr-4">{formatBRL(c.preco_unitario_bruto)}</td>
                  <td className="py-2 pr-4">{formatBRL(c.preco_unitario_liquido)}</td>
                  <td className="py-2 pr-4">{REGIME_LABELS[c.regime_tributario]}</td>
                </tr>
              ))}
              {compras.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-muted-foreground">
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
