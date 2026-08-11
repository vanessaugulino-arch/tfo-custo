export interface CampoImport {
  id: string;
  label: string;
  tipo: "monetario" | "numerico" | "texto" | "data";
  obrigatorio: boolean;
  keywords: string[];
  explicacao: string;
}

export interface ModeloImport {
  id: "insumos" | "servicos" | "estoque";
  label: string;
  campos: CampoImport[];
  linhaExemplo: string[];
}

export const MODELO_INSUMOS: ModeloImport = {
  id: "insumos",
  label: "Insumos (compras)",
  campos: [
    { id: "fornecedor", label: "Fornecedor", tipo: "texto", obrigatorio: true, keywords: ["fornecedor", "supplier"], explicacao: "Nome do fornecedor. Se não existir ainda, é criado automaticamente." },
    { id: "material", label: "Material / insumo", tipo: "texto", obrigatorio: true, keywords: ["material", "insumo", "mp", "matéria", "materia"], explicacao: "Nome do material ou matéria-prima. Se não existir, é criado automaticamente." },
    { id: "pack", label: "Pack", tipo: "numerico", obrigatorio: true, keywords: ["pack", "embalagem", "rolo", "volume"], explicacao: "A cada quantos metros/unidades o fornecedor vende este material." },
    { id: "quantidade_comprada", label: "Quantidade comprada", tipo: "numerico", obrigatorio: true, keywords: ["quantidade", "qtd", "comprada"], explicacao: "Quantidade total comprada nesta nota/lote, na unidade de compra (metro, kg ou peça)." },
    { id: "preco_pago", label: "Preço pago (R$)", tipo: "monetario", obrigatorio: true, keywords: ["preco", "preço", "valor", "pago", "total"], explicacao: "Valor total pago pelo lote (não o valor unitário)." },
    { id: "unidade_compra", label: "Unidade de compra", tipo: "texto", obrigatorio: false, keywords: ["unidade", "medida"], explicacao: "metro, peso_kg ou peca. Se ausente, assume metro." },
    { id: "fator_metros_por_unidade", label: "Metros por unidade", tipo: "numerico", obrigatorio: false, keywords: ["rendimento", "metros por", "fator"], explicacao: "Quantos metros lineares equivalem a 1 kg (ou a 1 peça/rolo). Obrigatório apenas quando a unidade não é metro." },
    { id: "regime_tributario", label: "Regime tributário", tipo: "texto", obrigatorio: false, keywords: ["regime", "tributário", "tributario", "imposto"], explicacao: "simples_nacional, lucro_presumido_real ou iva_dual_2027. Se ausente, assume Simples Nacional." },
    { id: "data_compra", label: "Data da compra", tipo: "data", obrigatorio: false, keywords: ["data", "compra"], explicacao: "Data da compra. Se ausente, usa a data de hoje." },
  ],
  linhaExemplo: ["Fornecedor XYZ", "Elástico 3cm", "25", "100", "350.00", "metro", "1", "simples_nacional", "2026-08-01"],
};

export const MODELO_SERVICOS: ModeloImport = {
  id: "servicos",
  label: "Serviços",
  campos: [
    { id: "fornecedor", label: "Fornecedor", tipo: "texto", obrigatorio: true, keywords: ["fornecedor", "supplier"], explicacao: "Nome do fornecedor do serviço. Se não existir, é criado automaticamente." },
    { id: "servico", label: "Tipo de serviço", tipo: "texto", obrigatorio: true, keywords: ["servico", "serviço", "tipo"], explicacao: "Ex: Modelagem, Corte, Costura. Se não existir, é criado automaticamente." },
    { id: "categorias", label: "Categorias atendidas", tipo: "texto", obrigatorio: false, keywords: ["categoria", "categorias"], explicacao: "Uma ou mais categorias separadas por vírgula (ex: Camisa, Calça). Categorias novas são criadas automaticamente." },
    { id: "modelo_precificacao", label: "Modelo de precificação", tipo: "texto", obrigatorio: true, keywords: ["modelo", "precificação", "precificacao"], explicacao: "peca, tempo ou produto." },
    { id: "custo_por_minuto", label: "Custo por minuto (R$)", tipo: "monetario", obrigatorio: false, keywords: ["minuto", "custo por minuto"], explicacao: "Obrigatório apenas quando o modelo é 'tempo'." },
  ],
  linhaExemplo: ["AJW", "Corte", "Camisa, Calça", "peca", ""],
};

export const MODELO_ESTOQUE: ModeloImport = {
  id: "estoque",
  label: "Ajustes de estoque",
  campos: [
    { id: "material", label: "Material", tipo: "texto", obrigatorio: true, keywords: ["material", "insumo"], explicacao: "Nome do material. Se não existir, é criado automaticamente." },
    { id: "quantidade", label: "Quantidade (+ entra / − sai)", tipo: "numerico", obrigatorio: true, keywords: ["quantidade", "saldo", "ajuste"], explicacao: "Positivo para entrada, negativo para saída — ex: ajuste de inventário." },
    { id: "observacao", label: "Observação", tipo: "texto", obrigatorio: false, keywords: ["observação", "observacao", "motivo"], explicacao: "Motivo do ajuste, opcional." },
  ],
  linhaExemplo: ["Elástico 3cm", "-5", "Inventário mensal"],
};

export function sugerirCampo(nomeColuna: string, campos: CampoImport[]): string {
  const lower = nomeColuna.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let melhor: { id: string; len: number } | null = null;
  for (const campo of campos) {
    for (const kw of campo.keywords) {
      const kwNorm = kw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (lower.includes(kwNorm) && (!melhor || kwNorm.length > melhor.len)) {
        melhor = { id: campo.id, len: kwNorm.length };
      }
    }
  }
  return melhor?.id ?? "nao_importar";
}
