import { useState } from "react";
import * as XLSX from "xlsx";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Tour, useTourAutoShow, type TourStep } from "@/components/Tour";
import { useAprovarProduto, useColecoes, useDescartarProduto, useFecharColecao, useProdutos } from "@/hooks/useData";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "colecoes-filtro",
    title: "Selecione uma coleção para poder fechá-la",
    texto: "Clique em uma coleção específica (não em 'Todas as coleções') para ver o botão de fechamento e o status dela.",
  },
  {
    targetId: "colecoes-fechar",
    title: "Fechar coleção trava o custo definitivo",
    texto:
      "Enquanto a coleção está aberta, os custos de serviços 'por coleção'/'peça desenvolvida' são só uma estimativa. Fechar recalcula e trava o valor final — você pode continuar adicionando produtos depois, mas os custos já fechados só mudam se fechar de novo.",
  },
  {
    targetId: "colecoes-tabela",
    title: "Aprovar dá baixa no estoque",
    texto:
      "Aprovar um produto desconta automaticamente os insumos usados do seu estoque. Produtos com custo 'provisório' ainda não tiveram a coleção fechada.",
  },
];

const STATUS_TONE: Record<string, "default" | "success" | "danger" | "muted"> = {
  rascunho: "default",
  aprovado: "success",
  descartado: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Simulado",
  aprovado: "Aprovado",
  descartado: "Descartado",
};

export function ColecoesScreen() {
  const { data: colecoes = [] } = useColecoes();
  const [colecaoId, setColecaoId] = useState<string | undefined>(undefined);
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "rascunho" | "aprovado" | "descartado">("todos");
  const { data: produtos = [] } = useProdutos(colecaoId);
  const aprovar = useAprovarProduto();
  const descartar = useDescartarProduto();
  const fecharColecao = useFecharColecao();
  const tour = useTourAutoShow("colecoes");

  const produtosFiltrados = produtos.filter((p) => statusFiltro === "todos" || p.status === statusFiltro);
  const colecaoSelecionada = colecoes.find((c) => c.id === colecaoId) ?? null;

  async function handleFecharColecao() {
    if (!colecaoSelecionada) return;
    const ok = window.confirm(
      `Fechar "${colecaoSelecionada.nome}"? Isso trava o custo definitivo de todos os produtos desta coleção, dividindo os serviços "por coleção" e "por peça desenvolvida" entre as peças produzidas. Você pode continuar adicionando produtos depois, mas os custos já fechados só mudam se você fechar de novo.`,
    );
    if (!ok) return;
    try {
      await fecharColecao.mutateAsync(colecaoSelecionada.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível fechar esta coleção.");
    }
  }

  function handleExportar() {
    const linhas = produtosFiltrados.map((p) => ({
      Código: p.codigo ?? "",
      Descrição: p.descricao ?? "",
      Produto: p.nome,
      Categoria: p.categoria?.nome ?? "",
      Coleção: p.colecao?.nome ?? "",
      "Qtd. produzida": p.quantidade_produzida ?? "",
      "Custo unitário": p.custo_total_unitario ?? "",
      Status: STATUS_LABEL[p.status] ?? p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    const data = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `produtos_${data}.xlsx`);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageTitle title="Coleções e simulações de custo" subtitle="Aprove os pilotos que vão para produção — a aprovação desconta o estoque previsto." />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={tour.abrir}>
            Tour desta tela
          </Button>
          <Button variant="secondary" onClick={handleExportar}>
            Exportar (.xlsx)
          </Button>
        </div>
      </div>
      <Tour steps={TOUR_STEPS} aberto={tour.aberto} onFechar={tour.fechar} />

      <div className="mb-4 flex flex-wrap gap-2" data-tour="colecoes-filtro">
        <button
          onClick={() => setColecaoId(undefined)}
          className={`rounded-full px-3 py-1.5 text-sm border ${!colecaoId ? "bg-primary text-white border-primary" : "border-border bg-card"}`}
        >
          Todas as coleções
        </button>
        {colecoes.map((c) => (
          <button
            key={c.id}
            onClick={() => setColecaoId(c.id)}
            className={`rounded-full px-3 py-1.5 text-sm border ${colecaoId === c.id ? "bg-primary text-white border-primary" : "border-border bg-card"}`}
          >
            {c.nome}
            {(c.periodo_inicio || c.periodo_fim) && (
              <span className="ml-1 opacity-70">
                ({formatDate(c.periodo_inicio)} – {formatDate(c.periodo_fim)})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between gap-2" data-tour="colecoes-fechar">
        <div className="flex gap-2">
          {(["todos", "rascunho", "aprovado", "descartado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFiltro(s)}
              className={`rounded-md px-3 py-1.5 text-sm ${statusFiltro === s ? "bg-muted font-semibold" : "text-muted-foreground"}`}
            >
              {s === "todos" ? "Todos" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {colecaoSelecionada && (
          <div className="flex items-center gap-2">
            {colecaoSelecionada.fechada_em ? (
              <Badge tone="success">Fechada em {formatDate(colecaoSelecionada.fechada_em)}</Badge>
            ) : (
              <>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  Coleção aberta — custos "por coleção"/"peça desenvolvida" são provisórios
                  <InfoTooltip>
                    Enquanto a coleção estiver aberta, o custo desses serviços é apenas uma estimativa. Ao fechar, o
                    sistema divide o valor total combinado com o fornecedor entre as peças que efetivamente usaram
                    cada serviço (ou entre todas as peças da coleção, no caso de "por coleção") e trava o custo
                    definitivo de cada produto.
                  </InfoTooltip>
                </span>
                <Button variant="secondary" onClick={handleFecharColecao} disabled={fecharColecao.isPending}>
                  {fecharColecao.isPending ? "Fechando..." : "Fechar coleção"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <Card data-tour="colecoes-tabela">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Código</th>
              <th className="py-2 pr-4">Produto</th>
              <th className="py-2 pr-4">Categoria</th>
              <th className="py-2 pr-4">Coleção</th>
              <th className="py-2 pr-4">Qtd. produzida</th>
              <th className="py-2 pr-4">Custo unitário</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.map((p) => (
              <tr key={p.id} className="border-b border-border/60">
                <td className="py-2 pr-4 text-muted-foreground">{p.codigo ?? "—"}</td>
                <td className="py-2 pr-4">{p.nome}</td>
                <td className="py-2 pr-4">{p.categoria?.nome ?? "—"}</td>
                <td className="py-2 pr-4">{p.colecao?.nome ?? "—"}</td>
                <td className="py-2 pr-4">{formatNumber(p.quantidade_produzida)}</td>
                <td className="py-2 pr-4">
                  {formatBRL(p.custo_total_unitario)}
                  {p.temCustoPooled && p.colecao && !p.colecao.fechada_em && (
                    <span className="ml-1 text-xs text-muted-foreground italic">provisório</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </td>
                <td className="py-2 pr-4">
                  {p.status === "rascunho" && (
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => aprovar.mutate(p.id)} disabled={aprovar.isPending}>
                        Aprovar
                      </Button>
                      <Button variant="ghost" onClick={() => descartar.mutate(p.id)} disabled={descartar.isPending}>
                        Descartar
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {produtosFiltrados.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-muted-foreground">
                  Nenhum produto por aqui ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
