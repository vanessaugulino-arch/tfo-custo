import { useState } from "react";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import { useAprovarProduto, useColecoes, useDescartarProduto, useProdutos } from "@/hooks/useData";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";

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

  const produtosFiltrados = produtos.filter((p) => statusFiltro === "todos" || p.status === statusFiltro);

  return (
    <div>
      <PageTitle title="Coleções e simulações de custo" subtitle="Aprove os pilotos que vão para produção — a aprovação desconta o estoque previsto." />

      <div className="mb-4 flex flex-wrap gap-2">
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

      <div className="mb-4 flex gap-2">
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

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
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
                <td className="py-2 pr-4">{p.nome}</td>
                <td className="py-2 pr-4">{p.categoria?.nome ?? "—"}</td>
                <td className="py-2 pr-4">{p.colecao?.nome ?? "—"}</td>
                <td className="py-2 pr-4">{formatNumber(p.quantidade_produzida)}</td>
                <td className="py-2 pr-4">{formatBRL(p.custo_total_unitario)}</td>
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
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
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
