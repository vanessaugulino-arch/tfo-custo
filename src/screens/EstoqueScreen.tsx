import { Fragment, useState } from "react";
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
      "Entradas de compra, saídas por aprovação de produto e beneficiamento acontecem sozinhas. Clique em 'Ver movimentos' para abrir o histórico de um material, ou use o ícone de ajuste para corrigir o saldo depois de uma produção ou inventário.",
  },
];

function IconAjustar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className}>
      <line x1="3" y1="5" x2="17" y2="5" />
      <circle cx="12" cy="5" r="1.8" fill="currentColor" stroke="none" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <circle cx="7" cy="10" r="1.8" fill="currentColor" stroke="none" />
      <line x1="3" y1="15" x2="17" y2="15" />
      <circle cx="14" cy="15" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function EstoqueScreen() {
  const { data: estoque = [] } = useEstoqueAtual();
  const ajustar = useAjusteEstoque();
  const [importAberto, setImportAberto] = useState(false);
  const tour = useTourAutoShow("estoque");

  const [materialExpandido, setMaterialExpandido] = useState<string | null>(null);
  const { data: movimentosExpandido = [] } = useMovimentosEstoque(materialExpandido ?? undefined);

  const [ajuste, setAjuste] = useState<{ id: string; label: string } | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [tipo, setTipo] = useState<"ajuste_manual" | "ajuste_inventario">("ajuste_inventario");
  const [observacao, setObservacao] = useState("");

  function toggleMovimentos(materialId: string) {
    setMaterialExpandido((atual) => (atual === materialId ? null : materialId));
  }

  function abrirAjuste(materialId: string, label: string) {
    setAjuste({ id: materialId, label });
    setQuantidade("");
    setTipo("ajuste_inventario");
    setObservacao("");
  }

  function fecharAjuste() {
    setAjuste(null);
  }

  async function handleAjuste(e: React.FormEvent) {
    e.preventDefault();
    if (!ajuste || !quantidade) return;
    await ajustar.mutateAsync({
      materialId: ajuste.id,
      quantidade: Number(quantidade),
      tipo,
      observacao: observacao || (tipo === "ajuste_inventario" ? "Ajuste por inventário" : "Ajuste manual"),
    });
    fecharAjuste();
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
          subtitle={
            <>
              Entradas de compra e saídas por aprovação de produto são automáticas. Use o ajuste{" "}
              <IconAjustar className="inline-block w-3.5 h-3.5 align-middle text-foreground" /> para corrigir após
              produção ou inventário.
            </>
          }
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

      <Card data-tour="estoque-saldo">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Código</th>
              <th className="py-2 pr-4">Material</th>
              <th className="py-2 pr-4">Unidade</th>
              <th className="py-2 pr-4">Saldo atual</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {estoque.map((e) => (
              <Fragment key={e.material_id}>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-4">{e.material.codigo}</td>
                  <td className="py-2 pr-4">{labelMaterial(e.material)}</td>
                  <td className="py-2 pr-4">{e.unidadeEstoque}</td>
                  <td className={`py-2 pr-4 font-medium ${e.saldo_atual < 0 ? "text-destructive" : ""}`}>
                    {formatNumber(e.saldo_atual)}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center justify-end gap-3">
                      <button className="underline text-muted-foreground" onClick={() => toggleMovimentos(e.material_id)}>
                        {materialExpandido === e.material_id ? "Ocultar movimentos" : "Ver movimentos"}
                      </button>
                      <button
                        type="button"
                        title="Ajustar quantidade — corrija o saldo após uma produção não lançada ou um inventário físico"
                        onClick={() => abrirAjuste(e.material_id, labelMaterial(e.material))}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <IconAjustar />
                      </button>
                    </div>
                  </td>
                </tr>
                {materialExpandido === e.material_id && (
                  <tr className="border-b border-border/60 bg-muted/30">
                    <td colSpan={5} className="p-0">
                      <div className="px-4 py-3">
                        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                          Movimentos de "{labelMaterial(e.material)}"
                        </h3>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-muted-foreground">
                              <th className="py-1.5 pr-4">Data</th>
                              <th className="py-1.5 pr-4">Tipo</th>
                              <th className="py-1.5 pr-4">Quantidade</th>
                              <th className="py-1.5 pr-4">Observação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {movimentosExpandido.map((m: any) => (
                              <tr key={m.id} className="border-b border-border/40">
                                <td className="py-1.5 pr-4">{formatDate(m.criado_em)}</td>
                                <td className="py-1.5 pr-4">{MOVIMENTO_LABELS[m.tipo]}</td>
                                <td className={`py-1.5 pr-4 ${m.quantidade < 0 ? "text-destructive" : "text-success"}`}>
                                  {m.quantidade > 0 ? "+" : ""}
                                  {formatNumber(m.quantidade)}
                                </td>
                                <td className="py-1.5 pr-4 text-muted-foreground">{m.observacao}</td>
                              </tr>
                            ))}
                            {movimentosExpandido.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                                  Nenhum movimento ainda.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
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

      {ajuste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={fecharAjuste}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 text-card-foreground" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-sm font-semibold">Ajustar quantidade</h2>
            <p className="mb-4 text-sm text-muted-foreground">{ajuste.label}</p>
            <form onSubmit={handleAjuste} className="space-y-3">
              <Field label="Quantidade (+ entra / − sai)">
                <Input
                  type="number"
                  step="any"
                  autoFocus
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="ex: -3.5"
                />
              </Field>
              <Field label="Motivo">
                <Select value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
                  <option value="ajuste_inventario">Inventário</option>
                  <option value="ajuste_manual">Ajuste manual (pós-produção etc.)</option>
                </Select>
              </Field>
              <Field label="Observação (opcional)">
                <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
              </Field>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={fecharAjuste}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={ajustar.isPending}>
                  Ajustar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
