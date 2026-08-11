export interface ServicoLinha {
  modeloPrecificacao: "peca" | "tempo" | "produto";
  precoUnitario: number | null;
  tempoMinutos: number | null;
  custoPorMinutoAplicado: number | null;
}

export interface InsumoLinha {
  consumoQuantidade: number;
  desperdicioPct: number;
  precoUnitarioAplicado: number;
}

/** Contribuição de UM serviço ao custo de UMA peça (antes de diluir por quantidade produzida, no caso de "peça"). */
export function calcularValorServico(linha: ServicoLinha): number {
  if (linha.modeloPrecificacao === "tempo") {
    return (linha.tempoMinutos ?? 0) * (linha.custoPorMinutoAplicado ?? 0);
  }
  // "peca" e "produto" partem de um preço unitário informado/aceito.
  return linha.precoUnitario ?? 0;
}

/**
 * Custo por peça de um serviço já lançado.
 * "peca" (peça desenvolvida) é um valor fixo total que se dilui pela quantidade produzida.
 * "tempo" e "produto" já são custo por peça produzida, não diluem.
 */
export function custoServicoPorPeca(
  linha: ServicoLinha,
  quantidadeProduzida: number,
): number {
  const valor = calcularValorServico(linha);
  if (linha.modeloPrecificacao === "peca") {
    if (!quantidadeProduzida || quantidadeProduzida <= 0) return 0;
    return valor / quantidadeProduzida;
  }
  return valor;
}

export function custoInsumoPorPeca(linha: InsumoLinha): number {
  return linha.consumoQuantidade * (1 + linha.desperdicioPct / 100) * linha.precoUnitarioAplicado;
}

export function custoTotalProduto(
  servicos: ServicoLinha[],
  insumos: InsumoLinha[],
  quantidadeProduzida: number,
): number {
  const totalServicos = servicos.reduce(
    (acc, s) => acc + custoServicoPorPeca(s, quantidadeProduzida),
    0,
  );
  const totalInsumos = insumos.reduce((acc, i) => acc + custoInsumoPorPeca(i), 0);
  return totalServicos + totalInsumos;
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
