import { useState } from "react";
import * as XLSX from "xlsx";
import { ImportModal, type ResultadoImport } from "@/components/ImportModal";
import { Tour, useTourAutoShow, type TourStep } from "@/components/Tour";
import { Button, Card, Field, Input, PageTitle, Select } from "@/components/ui";
import { useAjusteEstoque, useEstoqueAtual, useMovimentosEstoque } from "@/hooks/useData";
import { findOrCreateMaterial, parseNumeroPtBr } from "@/lib/importHelpers";
import { MODELO_ESTOQUE } from "@/lib/importFields";
import { formatDate, formatNumber, labelMaterial, MOVIMENTO_LABELS } from "@/lib/format";

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "estoque-saldo",
    title: "O saldo é sempre automático",
    texto:
      "Entradas de compra, saídas por aprovação de produto e beneficiamento acontecem sozinhas. Aqui você só acompanha o resultado — clique em 'Ver movimentos' para ver o histórico de um material.",
  },
  {
    targetId: "estoque-ajuste",
    title: "Use o ajuste só para corrigir",
    texto: "Inventário físico deu diferente do sistema? Perda, sobra ou erro de digitação em outra tela? Lance aqui um ajuste manual — positivo para entrada, negativo para saída.",
  },
  {
    targetId: "estoque-movimentos",
    title: "Histórico completo",
    texto: "Todo movimento fica registrado com data, tipo e observação — nada é sobrescrito, então dá para auditar depois.",
  },
];

export function EstoqueScreen() {
  const { data: estoque = [] } = useEstoqueAtual();
  const [materialSelecionado, setMaterialSelecionado] = useState<string | undefined>(undefined);
  const { data: movimentos = [] } = useMovimentosEstoque(materialSelecionado);
  const materialFiltrado = estoque.find((e) => e.material_id === materialSelecionado)?.material ?? null;

  function verMovimentos(materialId: string) {
    setMaterialSelecionado(materialId);
    document.querySelector('[data-tour="estoque-movimentos"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const ajustar = useAjusteEstoque();
  const [importAberto, setImportAberto] = useState(false);
  const tour = useTourAutoShow("estoque");

  const [materialId, setMaterialId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [tipo, setTipo] = useState<"ajuste_manual" | "ajuste_inventario">("ajuste_inventario");
  const [observacao, setObservacao] = useState("");

  async function handleAjuste(e: React.FormEvent) {
    e.preventDefault();
    if (!materialId || !quantidade) return;
    await ajustar.mutateAsync({
      materialId,
      quantidade: Number(quantidade),
      tipo,
      observacao: observacao || (tipo === "ajuste_inventario" ? "Ajuste por inventário" : "Ajuste manual"),
    });
    setQuantidade("");
    setObservacao("");
  }

  async function handleImportar(linhas: Record<string, string>[]): Promise<ResultadoImport> {
    let sucesso = 0;
    const erros: ResultadoImport["erros"] = [];
    for (let i = 0; i < linhas.length; i++) {
      const row = linhas[i];
      try {
        const qtd = parseNumeroPtBr(row.quantidade);
        if (!row.material?.trim()) throw new Error("material vazio");
        if (isNaN(qtd) || qtd === 0) throw new Error("quantidade inválida");
        const materialId = await findOrCreateMaterial(row.material, row.cor);
        await ajustar.mutateAsync({
          materialId,
          quantidade: qtd,
          tipo: "ajuste_inventario",
          observacao: row.observacao?.trim() || "Importado via planilha",
        });
        sucesso++;
      } catch (err) {
        erros.push({ linha: i + 2, motivo: err instanceof Error ? err.message : String(err) });
      }
    }
    return { sucesso, erros };
  }

  function handleExportar() {
    const linhas = estoque.map((e) => ({
      Código: e.material.codigo ?? "",
      Material: e.material.nome,
      Cor: e.material.cor ?? "",
      Unidade: e.unidadeEstoque,
      "Saldo atual": e.saldo_atual,
    }));
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");
    const data = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `estoque_insumos_${data}.xlsx`);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title="Estoque de insumos"
          subtitle="Entradas de compra e saídas por aprovação de produto são automáticas. Use o ajuste para corrigir após produção ou inventário."
        />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={tour.abrir}>
            Tour desta tela
          </Button>
          <Button variant="secondary" onClick={handleExportar}>
            Exportar (.xlsx)
          </Button>
          <Button variant="secondary" onClick={() => setImportAberto(true)}>
            Importar planilha
          </Button>
        </div>
      </div>

      <Tour steps={TOUR_STEPS} aberto={tour.aberto} onFechar={tour.fechar} />

      {importAberto && (
        <ImportModal modelo={MODELO_ESTOQUE} onClose={() => setImportAberto(false)} onConfirmar={handleImportar} />
      )}

      <Card className="mb-8" data-tour="estoque-saldo">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Saldo atual</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Material</th>
              <th className="py-2 pr-4">Código</th>
              <th className="py-2 pr-4">Unidade</th>
              <th className="py-2 pr-4">Saldo atual</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {estoque.map((e) => (
              <tr key={e.material_id} className="border-b border-border/60">
                <td className="py-2 pr-4">{labelMaterial(e.material)}</td>
                <td className="py-2 pr-4">{e.material.codigo}</td>
                <td className="py-2 pr-4">{e.unidadeEstoque}</td>
                <td className={`py-2 pr-4 font-medium ${e.saldo_atual < 0 ? "text-destructive" : ""}`}>
                  {formatNumber(e.saldo_atual)}
                </td>
                <td className="py-2 pr-4">
                  <button className="underline text-muted-foreground" onClick={() => verMovimentos(e.material_id)}>
                    Ver movimentos
                  </button>
                </td>
              </tr>
            ))}
            {estoque.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  Nenhum material cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="mb-8" data-tour="estoque-ajuste">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Ajustar quantidade</h2>
        <form onSubmit={handleAjuste} className="grid grid-cols-4 gap-3 items-end">
          <Field label="Material">
            <Select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
              <option value="">Selecionar...</option>
              {estoque.map((e) => (
                <option key={e.material_id} value={e.material_id}>
                  {labelMaterial(e.material)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantidade (+ entra / − sai)">
            <Input type="number" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="ex: -3.5" />
          </Field>
          <Field label="Motivo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
              <option value="ajuste_inventario">Inventário</option>
              <option value="ajuste_manual">Ajuste manual (pós-produção etc.)</option>
            </Select>
          </Field>
          <Button type="submit" disabled={ajustar.isPending}>
            Ajustar
          </Button>
          <div className="col-span-4">
            <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observação (opcional)" />
          </div>
        </form>
      </Card>

      <Card data-tour="estoque-movimentos">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Movimentos {materialFiltrado ? <>de "{labelMaterial(materialFiltrado)}"</> : "(todos os materiais)"}
          </h2>
          {materialSelecionado && (
            <button className="text-sm underline text-muted-foreground" onClick={() => setMaterialSelecionado(undefined)}>
              Limpar filtro
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Data</th>
              <th className="py-2 pr-4">Material</th>
              <th className="py-2 pr-4">Tipo</th>
              <th className="py-2 pr-4">Quantidade</th>
              <th className="py-2 pr-4">Observação</th>
            </tr>
          </thead>
          <tbody>
            {movimentos.map((m: any) => (
              <tr key={m.id} className="border-b border-border/60">
                <td className="py-2 pr-4">{formatDate(m.criado_em)}</td>
                <td className="py-2 pr-4">{m.material ? labelMaterial(m.material) : ""}</td>
                <td className="py-2 pr-4">{MOVIMENTO_LABELS[m.tipo]}</td>
                <td className={`py-2 pr-4 ${m.quantidade < 0 ? "text-destructive" : "text-success"}`}>
                  {m.quantidade > 0 ? "+" : ""}
                  {formatNumber(m.quantidade)}
                </td>
                <td className="py-2 pr-4 text-muted-foreground">{m.observacao}</td>
              </tr>
            ))}
            {movimentos.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  Nenhum movimento ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
