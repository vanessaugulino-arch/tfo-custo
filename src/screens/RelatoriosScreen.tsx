import { useMemo } from "react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Tour, useTourAutoShow, type TourStep } from "@/components/Tour";
import { Badge, Card, PageTitle } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useCategorias, useComprasInsumo, useEstoqueAtual, useFornecedores, usePerfilNegocio, useProdutos, useServicosFornecedor, type CompraInsumoCompleta } from "@/hooks/useData";
import { useFornecedoresPorCategoriaTodos, useProdutoServicosTodos, useTodosMovimentos, type ProdutoServicoRelatorio } from "@/hooks/useRelatorios";
import { formatBRL, formatNumber, labelMaterial } from "@/lib/format";

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "relatorios-estoque-parado",
    title: "Estoque parado é dinheiro sem girar",
    texto: "Materiais com saldo positivo que não tiveram nenhum movimento recente — vale revisar se ainda vão ser usados.",
  },
  {
    targetId: "relatorios-kraljic",
    title: "Matriz de Kraljic simplificada",
    texto:
      "Cada ponto é um material: quanto mais alto, mais você gastou nele; quanto mais à direita, mais fornecedores alternativos você tem. Materiais no canto superior esquerdo (muito gasto, poucos fornecedores) merecem atenção — é onde você fica mais exposta.",
  },
];

function valorEfetivoServico(ps: ProdutoServicoRelatorio): number {
  if (ps.valor_calculado != null) return ps.valor_calculado;
  if (ps.tempo_minutos != null) return (ps.tempo_minutos ?? 0) * (ps.custo_por_minuto_aplicado ?? 0);
  return ps.preco_unitario ?? 0;
}

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 === 0 ? (ordenado[meio - 1] + ordenado[meio]) / 2 : ordenado[meio];
}

function diasDesde(dataIso: string): number {
  return Math.floor((Date.now() - new Date(dataIso).getTime()) / 86400000);
}

export function RelatoriosScreen() {
  const { user } = useAuth();
  const { data: perfil } = usePerfilNegocio(user?.id);
  const { data: compras = [] } = useComprasInsumo();
  const { data: movimentos = [] } = useTodosMovimentos();
  const { data: estoqueAtual = [] } = useEstoqueAtual();
  const { data: fornecedores = [] } = useFornecedores();
  const { data: servicosFornecedor = [] } = useServicosFornecedor();
  const { data: produtoServicos = [] } = useProdutoServicosTodos();
  const { data: produtos = [] } = useProdutos();
  const { data: categorias = [] } = useCategorias();
  const { data: fornecedoresPorCategoriaRaw = [] } = useFornecedoresPorCategoriaTodos();
  const tour = useTourAutoShow("relatorios");

  const mostrarComparacaoInternoTerceiros = perfil?.modelo_producao === "misto";

  // --- 1. Estoque parado ---------------------------------------------------
  const estoqueParado = useMemo(() => {
    const ultimaMovPorMaterial = new Map<string, string>();
    for (const m of movimentos) {
      const atual = ultimaMovPorMaterial.get(m.material_id);
      if (!atual || m.criado_em > atual) ultimaMovPorMaterial.set(m.material_id, m.criado_em);
    }
    return estoqueAtual
      .filter((e) => e.saldo_atual > 0)
      .map((e) => {
        const ultima = ultimaMovPorMaterial.get(e.material_id);
        return { material: e.material, saldo: e.saldo_atual, ultima, dias: ultima ? diasDesde(ultima) : null };
      })
      .sort((a, b) => (b.dias ?? 999999) - (a.dias ?? 999999));
  }, [movimentos, estoqueAtual]);

  // --- 2. Volume de insumos x consumo médio --------------------------------
  const volumeConsumo = useMemo(() => {
    const saidaPorMaterial = new Map<string, { total: number; primeira: string; ultima: string }>();
    for (const m of movimentos) {
      if (m.tipo !== "saida_aprovacao") continue;
      const atual = saidaPorMaterial.get(m.material_id) ?? { total: 0, primeira: m.criado_em, ultima: m.criado_em };
      atual.total += Math.abs(m.quantidade);
      if (m.criado_em < atual.primeira) atual.primeira = m.criado_em;
      if (m.criado_em > atual.ultima) atual.ultima = m.criado_em;
      saidaPorMaterial.set(m.material_id, atual);
    }
    return estoqueAtual
      .map((e) => {
        const info = saidaPorMaterial.get(e.material_id);
        let consumoMedioMensal: number | null = null;
        if (info) {
          const meses = Math.max(1, (new Date(info.ultima).getTime() - new Date(info.primeira).getTime()) / (30 * 86400000));
          consumoMedioMensal = info.total / meses;
        }
        const mesesRestantes = consumoMedioMensal && consumoMedioMensal > 0 ? e.saldo_atual / consumoMedioMensal : null;
        return { material: e.material, saldo: e.saldo_atual, consumoMedioMensal, mesesRestantes };
      })
      .filter((r) => r.saldo > 0 || r.consumoMedioMensal)
      .sort((a, b) => (a.mesesRestantes ?? Infinity) - (b.mesesRestantes ?? Infinity));
  }, [movimentos, estoqueAtual]);

  // --- 3. Preço médio por tipo de serviço ----------------------------------
  const precoMedioServico = useMemo(() => {
    const sfMap = new Map(servicosFornecedor.map((sf) => [sf.id, sf]));
    const somaPorTipo = new Map<string, { soma: number; count: number }>();
    for (const ps of produtoServicos) {
      const sf = sfMap.get(ps.servico_fornecedor_id);
      if (!sf) continue;
      const nome = sf.servico?.nome ?? "—";
      const atual = somaPorTipo.get(nome) ?? { soma: 0, count: 0 };
      atual.soma += valorEfetivoServico(ps);
      atual.count += 1;
      somaPorTipo.set(nome, atual);
    }
    return Array.from(somaPorTipo.entries())
      .map(([nome, v]) => ({ nome, media: v.soma / v.count, amostras: v.count }))
      .sort((a, b) => b.media - a.media);
  }, [produtoServicos, servicosFornecedor]);

  // --- 4. Divisão dos gastos por categoria ---------------------------------
  const gastosPorCategoria = useMemo(() => {
    const somaPorCategoria = new Map<string, number>();
    for (const p of produtos) {
      if (p.status !== "aprovado") continue;
      const nome = p.categoria?.nome ?? "Sem categoria";
      const gasto = (p.custo_total_unitario ?? 0) * (p.quantidade_produzida ?? 0);
      somaPorCategoria.set(nome, (somaPorCategoria.get(nome) ?? 0) + gasto);
    }
    const total = Array.from(somaPorCategoria.values()).reduce((a, b) => a + b, 0);
    return Array.from(somaPorCategoria.entries())
      .map(([nome, valor]) => ({ nome, valor, pct: total > 0 ? (valor / total) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor);
  }, [produtos]);

  // --- 5. Fornecedores por categoria ----------------------------------------
  const fornecedoresPorCategoria = useMemo(() => {
    const mapa = new Map<string, Set<string>>();
    for (const row of fornecedoresPorCategoriaRaw) {
      if (!row.categoria_produto_id || !row.fornecedor_nome) continue;
      const set = mapa.get(row.categoria_produto_id) ?? new Set<string>();
      set.add(row.fornecedor_nome);
      mapa.set(row.categoria_produto_id, set);
    }
    return categorias
      .map((c) => ({ categoria: c.nome, fornecedores: Array.from(mapa.get(c.id) ?? []) }))
      .filter((r) => r.fornecedores.length > 0);
  }, [fornecedoresPorCategoriaRaw, categorias]);

  // --- 6. Ranking de fornecedores -------------------------------------------
  const rankingFornecedores = useMemo(() => {
    const gastoInsumos = new Map<string, number>();
    for (const c of compras as CompraInsumoCompleta[]) {
      gastoInsumos.set(c.fornecedor_id, (gastoInsumos.get(c.fornecedor_id) ?? 0) + c.preco_pago);
    }
    const sfMap = new Map(servicosFornecedor.map((sf) => [sf.id, sf]));
    const produtoMap = new Map(produtos.map((p) => [p.id, p]));
    const gastoServicos = new Map<string, number>();
    for (const ps of produtoServicos) {
      const sf = sfMap.get(ps.servico_fornecedor_id);
      const produto = produtoMap.get(ps.produto_id);
      if (!sf || !produto || produto.status !== "aprovado") continue;
      const total = valorEfetivoServico(ps) * (produto.quantidade_produzida ?? 0);
      gastoServicos.set(sf.fornecedor_id, (gastoServicos.get(sf.fornecedor_id) ?? 0) + total);
    }
    return fornecedores
      .map((f) => {
        const insumos = gastoInsumos.get(f.id) ?? 0;
        const servicosVal = gastoServicos.get(f.id) ?? 0;
        return { fornecedor: f.nome, insumos, servicos: servicosVal, total: insumos + servicosVal };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [compras, produtoServicos, servicosFornecedor, produtos, fornecedores]);
  const maiorRanking = rankingFornecedores[0]?.total ?? 0;

  // --- 7. Matriz de Kraljic --------------------------------------------------
  const kraljic = useMemo(() => {
    const gastoPorMaterial = new Map<string, number>();
    const fornecedoresPorMaterial = new Map<string, Set<string>>();
    for (const c of compras as CompraInsumoCompleta[]) {
      gastoPorMaterial.set(c.material_id, (gastoPorMaterial.get(c.material_id) ?? 0) + c.preco_pago);
      const set = fornecedoresPorMaterial.get(c.material_id) ?? new Set<string>();
      set.add(c.fornecedor_id);
      fornecedoresPorMaterial.set(c.material_id, set);
    }
    const pontos = Array.from(gastoPorMaterial.entries())
      .map(([materialId, gasto]) => {
        const material = compras.find((c) => c.material_id === materialId)?.material;
        return { material, gasto, fornecedores: fornecedoresPorMaterial.get(materialId)?.size ?? 0 };
      })
      .filter((p) => !!p.material);
    return { pontos, medianaGasto: mediana(pontos.map((p) => p.gasto)), medianaFornecedores: mediana(pontos.map((p) => p.fornecedores)) };
  }, [compras]);

  // --- 8. Custo interno x terceiros ------------------------------------------
  const comparacaoInternoTerceiros = useMemo(() => {
    const custoServicosPorProduto = new Map<string, number>();
    for (const ps of produtoServicos) {
      custoServicosPorProduto.set(ps.produto_id, (custoServicosPorProduto.get(ps.produto_id) ?? 0) + valorEfetivoServico(ps));
    }
    let totalInterno = 0;
    let totalTerceiros = 0;
    const porProduto: { produto: string; interno: number; terceiros: number }[] = [];
    for (const p of produtos) {
      if (p.status === "descartado") continue;
      const internoUnit = p.custo_producao_interna_unitario ?? 0;
      const terceirosUnit = custoServicosPorProduto.get(p.id) ?? 0;
      if (internoUnit === 0 && terceirosUnit === 0) continue;
      const qtd = p.quantidade_produzida ?? 0;
      const internoTotal = internoUnit * qtd;
      const terceirosTotal = terceirosUnit * qtd;
      totalInterno += internoTotal;
      totalTerceiros += terceirosTotal;
      porProduto.push({ produto: p.nome, interno: internoTotal, terceiros: terceirosTotal });
    }
    return { totalInterno, totalTerceiros, porProduto: porProduto.sort((a, b) => b.interno + b.terceiros - (a.interno + a.terceiros)) };
  }, [produtos, produtoServicos]);
  const totalInternoTerceiros = comparacaoInternoTerceiros.totalInterno + comparacaoInternoTerceiros.totalTerceiros;

  return (
    <div className="pb-16">
      <div className="flex items-start justify-between gap-4">
        <PageTitle title="Relatórios" subtitle="Uma leitura do que já foi cadastrado — estoque, fornecedores, custos e categorias." />
        <button type="button" className="text-sm underline text-muted-foreground shrink-0" onClick={tour.abrir}>
          Tour desta tela
        </button>
      </div>
      <Tour steps={TOUR_STEPS} aberto={tour.aberto} onFechar={tour.fechar} />

      {/* 1. Estoque parado */}
      <Card className="mb-6" data-tour="relatorios-estoque-parado">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Estoque parado</h2>
        <p className="mb-3 text-xs text-muted-foreground">Materiais com saldo em estoque, ordenados do que está há mais tempo sem nenhuma movimentação.</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Material</th>
              <th className="py-2 pr-4">Saldo</th>
              <th className="py-2 pr-4">Última movimentação</th>
              <th className="py-2 pr-4">Dias parado</th>
            </tr>
          </thead>
          <tbody>
            {estoqueParado.slice(0, 15).map((r) => (
              <tr key={r.material.id} className="border-b border-border/60">
                <td className="py-2 pr-4">{labelMaterial(r.material)}</td>
                <td className="py-2 pr-4">{formatNumber(r.saldo)}</td>
                <td className="py-2 pr-4">{r.ultima ? new Date(r.ultima).toLocaleDateString("pt-BR") : "sem registro"}</td>
                <td className="py-2 pr-4">
                  {r.dias == null ? (
                    "—"
                  ) : r.dias > 90 ? (
                    <Badge tone="danger">{r.dias} dias</Badge>
                  ) : (
                    <span>{r.dias} dias</span>
                  )}
                </td>
              </tr>
            ))}
            {estoqueParado.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                  Nenhum material com saldo em estoque ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* 2. Volume x consumo médio */}
      <Card className="mb-6">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">
          Volume de insumos × consumo médio
          <InfoTooltip>
            Consumo médio mensal é calculado a partir das saídas por aprovação de produto registradas — precisa de pelo
            menos duas aprovações no material para ter uma estimativa. "Meses restantes" é o saldo atual dividido pelo
            consumo médio mensal.
          </InfoTooltip>
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">Quanto tempo o estoque atual de cada material ainda dura, no ritmo de consumo observado.</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Material</th>
              <th className="py-2 pr-4">Saldo</th>
              <th className="py-2 pr-4">Consumo médio/mês</th>
              <th className="py-2 pr-4">Meses restantes</th>
            </tr>
          </thead>
          <tbody>
            {volumeConsumo.slice(0, 15).map((r) => (
              <tr key={r.material.id} className="border-b border-border/60">
                <td className="py-2 pr-4">{labelMaterial(r.material)}</td>
                <td className={`py-2 pr-4 ${r.saldo < 0 ? "text-destructive font-medium" : ""}`}>{formatNumber(r.saldo)}</td>
                <td className="py-2 pr-4">{r.consumoMedioMensal != null ? formatNumber(r.consumoMedioMensal) : "sem dados suficientes"}</td>
                <td className="py-2 pr-4">
                  {r.saldo < 0 ? (
                    <Badge tone="danger">Estoque negativo</Badge>
                  ) : r.mesesRestantes != null ? (
                    r.mesesRestantes < 1 ? (
                      <Badge tone="danger">{formatNumber(r.mesesRestantes)} meses</Badge>
                    ) : (
                      `${formatNumber(r.mesesRestantes)} meses`
                    )
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {volumeConsumo.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                  Sem dados ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* 3. Preço médio por tipo de serviço */}
      <Card className="mb-6">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Preço médio por tipo de serviço</h2>
        <p className="mb-3 text-xs text-muted-foreground">Média do custo por peça realizado em produtos, por tipo de serviço (modelagem, corte, costura...).</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Serviço</th>
              <th className="py-2 pr-4">Preço médio</th>
              <th className="py-2 pr-4">Amostras</th>
            </tr>
          </thead>
          <tbody>
            {precoMedioServico.map((r) => (
              <tr key={r.nome} className="border-b border-border/60">
                <td className="py-2 pr-4">{r.nome}</td>
                <td className="py-2 pr-4">{formatBRL(r.media)}</td>
                <td className="py-2 pr-4 text-muted-foreground">{r.amostras}</td>
              </tr>
            ))}
            {precoMedioServico.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-muted-foreground">
                  Nenhum produto com serviço lançado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* 4. Gastos por categoria */}
      <Card className="mb-6">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Divisão dos gastos por categoria</h2>
        <p className="mb-3 text-xs text-muted-foreground">Custo total (custo unitário × quantidade produzida) dos produtos aprovados, por categoria.</p>
        <div className="flex flex-col gap-2">
          {gastosPorCategoria.map((r) => (
            <div key={r.nome} className="flex items-center gap-3 text-sm">
              <div className="w-32 shrink-0 truncate">{r.nome}</div>
              <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded" style={{ width: `${Math.max(2, r.pct)}%` }} />
              </div>
              <div className="w-28 shrink-0 text-right">{formatBRL(r.valor)}</div>
              <div className="w-14 shrink-0 text-right text-muted-foreground">{formatNumber(r.pct, 0)}%</div>
            </div>
          ))}
          {gastosPorCategoria.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto aprovado ainda.</p>}
        </div>
      </Card>

      {/* 5. Fornecedores por categoria */}
      <Card className="mb-6">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Fornecedores por categoria</h2>
        <p className="mb-3 text-xs text-muted-foreground">Quais fornecedores atendem cada categoria de produto (pelas categorias marcadas no cadastro do serviço).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fornecedoresPorCategoria.map((r) => (
            <div key={r.categoria} className="rounded-md border border-border p-3">
              <div className="text-sm font-medium mb-1">{r.categoria}</div>
              <div className="flex flex-wrap gap-1">
                {r.fornecedores.map((f) => (
                  <Badge key={f}>{f}</Badge>
                ))}
              </div>
            </div>
          ))}
          {fornecedoresPorCategoria.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria com fornecedor vinculado ainda.</p>}
        </div>
      </Card>

      {/* 6. Ranking de fornecedores */}
      <Card className="mb-6">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">
          Ranking de fornecedores
          <InfoTooltip>Soma o que já foi pago em compras de insumo com o custo realizado de serviços em produtos aprovados.</InfoTooltip>
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">Gasto total por fornecedor (insumos + serviços em produtos aprovados).</p>
        <div className="flex flex-col gap-2">
          {rankingFornecedores.slice(0, 10).map((r) => (
            <div key={r.fornecedor} className="flex items-center gap-3 text-sm">
              <div className="w-32 shrink-0 truncate">{r.fornecedor}</div>
              <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded" style={{ width: `${maiorRanking > 0 ? Math.max(2, (r.total / maiorRanking) * 100) : 0}%` }} />
              </div>
              <div className="w-28 shrink-0 text-right">{formatBRL(r.total)}</div>
            </div>
          ))}
          {rankingFornecedores.length === 0 && <p className="text-sm text-muted-foreground">Nenhum gasto registrado ainda.</p>}
        </div>
      </Card>

      {/* 7. Matriz de Kraljic */}
      <Card className="mb-6" data-tour="relatorios-kraljic">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Matriz de Kraljic simplificada</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Cada ponto é um material. Eixo vertical: valor total já gasto nesse material. Eixo horizontal: quantos
          fornecedores distintos já venderam esse material — quanto menos, maior o risco de dependência.
        </p>
        <KraljicChart pontos={kraljic.pontos} medianaGasto={kraljic.medianaGasto} medianaFornecedores={kraljic.medianaFornecedores} />
      </Card>

      {/* 8. Custo interno x terceiros */}
      {mostrarComparacaoInternoTerceiros && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Custo interno × serviços terceirizados</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Soma do custo de mão de obra própria incluído nos produtos versus o custo de serviços contratados de
            terceiros, nos mesmos produtos.
          </p>
          {totalInternoTerceiros > 0 ? (
            <>
              <div className="flex items-center gap-3 text-sm mb-2">
                <div className="w-32 shrink-0">Produção própria</div>
                <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                  <div className="h-full bg-success rounded" style={{ width: `${Math.max(2, (comparacaoInternoTerceiros.totalInterno / totalInternoTerceiros) * 100)}%` }} />
                </div>
                <div className="w-28 shrink-0 text-right">{formatBRL(comparacaoInternoTerceiros.totalInterno)}</div>
              </div>
              <div className="flex items-center gap-3 text-sm mb-4">
                <div className="w-32 shrink-0">Terceirizados</div>
                <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded" style={{ width: `${Math.max(2, (comparacaoInternoTerceiros.totalTerceiros / totalInternoTerceiros) * 100)}%` }} />
                </div>
                <div className="w-28 shrink-0 text-right">{formatBRL(comparacaoInternoTerceiros.totalTerceiros)}</div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4">Produto</th>
                    <th className="py-2 pr-4">Produção própria</th>
                    <th className="py-2 pr-4">Terceirizados</th>
                  </tr>
                </thead>
                <tbody>
                  {comparacaoInternoTerceiros.porProduto.map((r) => (
                    <tr key={r.produto} className="border-b border-border/60">
                      <td className="py-2 pr-4">{r.produto}</td>
                      <td className="py-2 pr-4">{r.interno > 0 ? formatBRL(r.interno) : "—"}</td>
                      <td className="py-2 pr-4">{r.terceiros > 0 ? formatBRL(r.terceiros) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum produto com custo de produção interna e serviço terceirizado lançados ainda.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

interface PontoKraljic {
  material: { id: string; nome: string; cor: string | null } | undefined;
  gasto: number;
  fornecedores: number;
}

function KraljicChart({ pontos, medianaGasto, medianaFornecedores }: { pontos: PontoKraljic[]; medianaGasto: number; medianaFornecedores: number }) {
  if (pontos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma compra registrada ainda.</p>;
  }
  const largura = 640;
  const altura = 360;
  const margem = 48;
  const maxGasto = Math.max(...pontos.map((p) => p.gasto), 1);
  const maxFornecedores = Math.max(...pontos.map((p) => p.fornecedores), 1);

  function x(fornecedores: number) {
    return margem + (fornecedores / (maxFornecedores + 1)) * (largura - margem * 2);
  }
  function y(gasto: number) {
    return altura - margem - (gasto / maxGasto) * (altura - margem * 2);
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full max-w-2xl" style={{ minWidth: 480 }}>
        <line x1={margem} y1={altura - margem} x2={largura - margem / 2} y2={altura - margem} className="stroke-border" strokeWidth={1} />
        <line x1={margem} y1={margem / 2} x2={margem} y2={altura - margem} className="stroke-border" strokeWidth={1} />
        <line
          x1={x(medianaFornecedores)}
          y1={margem / 2}
          x2={x(medianaFornecedores)}
          y2={altura - margem}
          className="stroke-border"
          strokeDasharray="4 4"
        />
        <line x1={margem} y1={y(medianaGasto)} x2={largura - margem / 2} y2={y(medianaGasto)} className="stroke-border" strokeDasharray="4 4" />
        <text x={margem} y={altura - margem + 20} className="fill-muted-foreground" fontSize={11}>
          Menos fornecedores
        </text>
        <text x={largura - margem - 90} y={altura - margem + 20} className="fill-muted-foreground" fontSize={11}>
          Mais fornecedores
        </text>
        <text x={4} y={margem} className="fill-muted-foreground" fontSize={11}>
          Mais gasto
        </text>
        <text x={4} y={altura - margem - 4} className="fill-muted-foreground" fontSize={11}>
          Menos gasto
        </text>
        {pontos.map((p) => (
          <g key={p.material!.id}>
            <circle cx={x(p.fornecedores)} cy={y(p.gasto)} r={6} className="fill-primary" opacity={0.85}>
              <title>
                {p.material!.nome}
                {p.material!.cor ? ` — ${p.material!.cor}` : ""}: {formatBRL(p.gasto)}, {p.fornecedores} fornecedor(es)
              </title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {pontos.map((p) => (
          <span key={p.material!.id}>
            {p.material!.nome}
            {p.material!.cor ? ` (${p.material!.cor})` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
