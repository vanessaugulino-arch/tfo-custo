export type ModeloPrecificacaoServico = "colecao" | "peca_desenvolvida" | "peca_produzida" | "tempo" | "metro_corrido";

export interface ServicoLinha {
  modeloPrecificacao: ModeloPrecificacaoServico;
  /** Usado em "peca_produzida": valor cobrado integralmente por peça, sem diluição. */
  precoUnitario: number | null;
  /** Usado em "tempo". */
  tempoMinutos: number | null;
  custoPorMinutoAplicado: number | null;
  /**
   * Usado em "colecao" e "peca_desenvolvida": custo por peça já resolvido (provisório, via
   * estimativa ao vivo, ou definitivo, após "fechar coleção") — a diluição pelo pool de peças
   * acontece fora daqui (servico_engajamento / fechar_colecao()), nunca aqui.
   */
  valorCalculado: number | null;
}

export interface InsumoLinha {
  consumoQuantidade: number;
  desperdicioPct: number;
  precoUnitarioAplicado: number;
}

/** Contribuição de UM serviço ao custo de UMA peça. */
export function calcularValorServico(linha: ServicoLinha): number {
  if (linha.modeloPrecificacao === "tempo") {
    return (linha.tempoMinutos ?? 0) * (linha.custoPorMinutoAplicado ?? 0);
  }
  if (linha.modeloPrecificacao === "peca_produzida") {
    return linha.precoUnitario ?? 0;
  }
  return linha.valorCalculado ?? 0;
}

/** Custo por peça de um serviço já lançado (a diluição pooled já vem resolvida na própria linha). */
export function custoServicoPorPeca(linha: ServicoLinha): number {
  return calcularValorServico(linha);
}

export function custoInsumoPorPeca(linha: InsumoLinha): number {
  return linha.consumoQuantidade * (1 + linha.desperdicioPct / 100) * linha.precoUnitarioAplicado;
}

export function custoTotalProduto(servicos: ServicoLinha[], insumos: InsumoLinha[]): number {
  const totalServicos = servicos.reduce((acc, s) => acc + custoServicoPorPeca(s), 0);
  const totalInsumos = insumos.reduce((acc, i) => acc + custoInsumoPorPeca(i), 0);
  return totalServicos + totalInsumos;
}

export interface CargoProducao {
  salarioBase: number;
  encargosPct: number;
  beneficiosMensal: number;
  quantidadePessoas: number;
}

/** Custo mensal de um cargo: (salário × (1 + encargos%) + benefícios) × nº de pessoas nesse cargo. */
export function custoMensalCargo(cargo: CargoProducao): number {
  return (cargo.salarioBase * (1 + cargo.encargosPct / 100) + cargo.beneficiosMensal) * cargo.quantidadePessoas;
}

export interface ResultadoCustoProducaoInterna {
  capacidadeEfetiva: number;
  mesesNecessarios: number;
  custoTotalPeriodo: number;
  custoPorPeca: number | null;
}

/**
 * Custo por peça da produção interna: a folha mensal total é diluída pela capacidade mensal
 * (ajustada por horas extra/absenteísmo, se informado) — o resultado não depende da quantidade em
 * si (meses necessários × folha ÷ quantidade sempre simplifica para folha ÷ capacidade efetiva),
 * mas calculamos passo a passo para poder explicar cada etapa ao usuário.
 */
export function custoProducaoInternaPorPeca(
  folhaMensalTotal: number,
  capacidadeMensalPecas: number,
  ajustePct: number,
  quantidade: number,
): ResultadoCustoProducaoInterna {
  const capacidadeEfetiva = capacidadeMensalPecas * (1 + ajustePct / 100);
  if (capacidadeEfetiva <= 0 || quantidade <= 0) {
    return { capacidadeEfetiva, mesesNecessarios: 0, custoTotalPeriodo: 0, custoPorPeca: null };
  }
  const mesesNecessarios = quantidade / capacidadeEfetiva;
  const custoTotalPeriodo = folhaMensalTotal * mesesNecessarios;
  return { capacidadeEfetiva, mesesNecessarios, custoTotalPeriodo, custoPorPeca: custoTotalPeriodo / quantidade };
}

/** Preço líquido de imposto do insumo, conforme regime tributário da compra. */
export function precoUnitarioLiquido(
  precoPago: number,
  quantidadeComprada: number,
  regimeTributario: string,
  aliquotaCreditoPct: number,
): number {
  const bruto = precoPago / quantidadeComprada;
  if (regimeTributario === "simples_nacional") return bruto;
  return bruto * (1 - aliquotaCreditoPct / 100);
}
