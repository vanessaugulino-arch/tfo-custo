export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      cargos_producao: {
        Row: {
          ativo: boolean
          atualizado_em: string
          beneficios_mensal: number
          criado_em: string
          encargos_pct: number
          id: string
          nome: string
          quantidade_pessoas: number
          salario_base: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          beneficios_mensal?: number
          criado_em?: string
          encargos_pct?: number
          id?: string
          nome: string
          quantidade_pessoas?: number
          salario_base?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          beneficios_mensal?: number
          criado_em?: string
          encargos_pct?: number
          id?: string
          nome?: string
          quantidade_pessoas?: number
          salario_base?: number
        }
        Relationships: []
      }
      categorias_produto: {
        Row: {
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      colecoes: {
        Row: {
          criado_em: string
          fechada_em: string | null
          id: string
          nome: string
          periodo_fim: string | null
          periodo_inicio: string | null
        }
        Insert: {
          criado_em?: string
          fechada_em?: string | null
          id?: string
          nome: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
        }
        Update: {
          criado_em?: string
          fechada_em?: string | null
          id?: string
          nome?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
        }
        Relationships: []
      }
      compras_insumo: {
        Row: {
          aliquota_credito_pct: number
          criado_em: string
          data_compra: string
          fator_metros_por_unidade: number
          fornecedor_id: string
          id: string
          material_id: string
          pack_quantidade: number
          preco_pago: number
          quantidade_comprada: number
          regime_tributario: string
          unidade_compra: string
        }
        Insert: {
          aliquota_credito_pct?: number
          criado_em?: string
          data_compra?: string
          fator_metros_por_unidade?: number
          fornecedor_id: string
          id?: string
          material_id: string
          pack_quantidade: number
          preco_pago: number
          quantidade_comprada: number
          regime_tributario?: string
          unidade_compra?: string
        }
        Update: {
          aliquota_credito_pct?: number
          criado_em?: string
          data_compra?: string
          fator_metros_por_unidade?: number
          fornecedor_id?: string
          id?: string
          material_id?: string
          pack_quantidade?: number
          preco_pago?: number
          quantidade_comprada?: number
          regime_tributario?: string
          unidade_compra?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_insumo_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_insumo_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          codigo: string | null
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          codigo?: string | null
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          codigo?: string | null
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      materiais: {
        Row: {
          codigo: string | null
          criado_em: string
          id: string
          nome: string
          unidade_padrao: string
        }
        Insert: {
          codigo?: string | null
          criado_em?: string
          id?: string
          nome: string
          unidade_padrao?: string
        }
        Update: {
          codigo?: string | null
          criado_em?: string
          id?: string
          nome?: string
          unidade_padrao?: string
        }
        Relationships: []
      }
      movimentos_estoque: {
        Row: {
          criado_em: string
          id: string
          material_id: string
          observacao: string | null
          quantidade: number
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
        }
        Insert: {
          criado_em?: string
          id?: string
          material_id: string
          observacao?: string | null
          quantidade: number
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
        }
        Update: {
          criado_em?: string
          id?: string
          material_id?: string
          observacao?: string | null
          quantidade?: number
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentos_estoque_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_negocio: {
        Row: {
          atualizado_em: string
          canal_principal: string[]
          capacidade_mensal_pecas: number | null
          criado_em: string
          estagio: string | null
          faturamento_faixa: string | null
          id: string
          modelo_producao: string | null
          nome_marca: string | null
          onboarding_concluido: boolean
          regime_tributario_padrao: string | null
          segmento: string[]
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          canal_principal?: string[]
          capacidade_mensal_pecas?: number | null
          criado_em?: string
          estagio?: string | null
          faturamento_faixa?: string | null
          id?: string
          modelo_producao?: string | null
          nome_marca?: string | null
          onboarding_concluido?: boolean
          regime_tributario_padrao?: string | null
          segmento?: string[]
          user_id: string
        }
        Update: {
          atualizado_em?: string
          canal_principal?: string[]
          capacidade_mensal_pecas?: number | null
          criado_em?: string
          estagio?: string | null
          faturamento_faixa?: string | null
          id?: string
          modelo_producao?: string | null
          nome_marca?: string | null
          onboarding_concluido?: boolean
          regime_tributario_padrao?: string | null
          segmento?: string[]
          user_id?: string
        }
        Relationships: []
      }
      produto_insumos: {
        Row: {
          compra_insumo_id: string
          consumo_quantidade: number
          criado_em: string
          custo_calculado: number
          desperdicio_pct: number
          id: string
          preco_unitario_aplicado: number
          produto_id: string
        }
        Insert: {
          compra_insumo_id: string
          consumo_quantidade: number
          criado_em?: string
          custo_calculado: number
          desperdicio_pct?: number
          id?: string
          preco_unitario_aplicado: number
          produto_id: string
        }
        Update: {
          compra_insumo_id?: string
          consumo_quantidade?: number
          criado_em?: string
          custo_calculado?: number
          desperdicio_pct?: number
          id?: string
          preco_unitario_aplicado?: number
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_insumos_compra_insumo_id_fkey"
            columns: ["compra_insumo_id"]
            isOneToOne: false
            referencedRelation: "compras_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_insumos_compra_insumo_id_fkey"
            columns: ["compra_insumo_id"]
            isOneToOne: false
            referencedRelation: "compras_insumo_precos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_insumos_compra_insumo_id_fkey"
            columns: ["compra_insumo_id"]
            isOneToOne: false
            referencedRelation: "ultima_compra_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_insumos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_servicos: {
        Row: {
          categoria_produto_id: string | null
          criado_em: string
          custo_por_minuto_aplicado: number | null
          id: string
          preco_unitario: number | null
          produto_id: string
          servico_engajamento_id: string | null
          servico_fornecedor_id: string
          tempo_minutos: number | null
          valor_calculado: number | null
        }
        Insert: {
          categoria_produto_id?: string | null
          criado_em?: string
          custo_por_minuto_aplicado?: number | null
          id?: string
          preco_unitario?: number | null
          produto_id: string
          servico_engajamento_id?: string | null
          servico_fornecedor_id: string
          tempo_minutos?: number | null
          valor_calculado?: number | null
        }
        Update: {
          categoria_produto_id?: string | null
          criado_em?: string
          custo_por_minuto_aplicado?: number | null
          id?: string
          preco_unitario?: number | null
          produto_id?: string
          servico_engajamento_id?: string | null
          servico_fornecedor_id?: string
          tempo_minutos?: number | null
          valor_calculado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_servicos_categoria_produto_id_fkey"
            columns: ["categoria_produto_id"]
            isOneToOne: false
            referencedRelation: "categorias_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_servicos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_servicos_servico_engajamento_id_fkey"
            columns: ["servico_engajamento_id"]
            isOneToOne: false
            referencedRelation: "servico_engajamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_servicos_servico_fornecedor_id_fkey"
            columns: ["servico_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "servico_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          aprovado_em: string | null
          categoria_produto_id: string | null
          colecao_id: string | null
          criado_em: string
          custo_producao_interna_unitario: number | null
          custo_total_unitario: number | null
          id: string
          nome: string
          quantidade_produzida: number | null
          status: string
        }
        Insert: {
          aprovado_em?: string | null
          categoria_produto_id?: string | null
          colecao_id?: string | null
          criado_em?: string
          custo_producao_interna_unitario?: number | null
          custo_total_unitario?: number | null
          id?: string
          nome: string
          quantidade_produzida?: number | null
          status?: string
        }
        Update: {
          aprovado_em?: string | null
          categoria_produto_id?: string | null
          colecao_id?: string | null
          criado_em?: string
          custo_producao_interna_unitario?: number | null
          custo_total_unitario?: number | null
          id?: string
          nome?: string
          quantidade_produzida?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_produto_id_fkey"
            columns: ["categoria_produto_id"]
            isOneToOne: false
            referencedRelation: "categorias_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_colecao_id_fkey"
            columns: ["colecao_id"]
            isOneToOne: false
            referencedRelation: "colecoes"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_beneficiamento: {
        Row: {
          compra_insumo_origem_id: string | null
          compra_insumo_resultante_id: string
          criado_em: string
          custo_beneficiamento: number
          id: string
          material_origem_id: string
          material_resultante_id: string
          quantidade_beneficiada: number
          servico_fornecedor_id: string
        }
        Insert: {
          compra_insumo_origem_id?: string | null
          compra_insumo_resultante_id: string
          criado_em?: string
          custo_beneficiamento: number
          id?: string
          material_origem_id: string
          material_resultante_id: string
          quantidade_beneficiada: number
          servico_fornecedor_id: string
        }
        Update: {
          compra_insumo_origem_id?: string | null
          compra_insumo_resultante_id?: string
          criado_em?: string
          custo_beneficiamento?: number
          id?: string
          material_origem_id?: string
          material_resultante_id?: string
          quantidade_beneficiada?: number
          servico_fornecedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servico_beneficiamento_compra_insumo_origem_id_fkey"
            columns: ["compra_insumo_origem_id"]
            isOneToOne: false
            referencedRelation: "compras_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_beneficiamento_compra_insumo_origem_id_fkey"
            columns: ["compra_insumo_origem_id"]
            isOneToOne: false
            referencedRelation: "compras_insumo_precos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_beneficiamento_compra_insumo_origem_id_fkey"
            columns: ["compra_insumo_origem_id"]
            isOneToOne: false
            referencedRelation: "ultima_compra_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_beneficiamento_compra_insumo_resultante_id_fkey"
            columns: ["compra_insumo_resultante_id"]
            isOneToOne: false
            referencedRelation: "compras_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_beneficiamento_compra_insumo_resultante_id_fkey"
            columns: ["compra_insumo_resultante_id"]
            isOneToOne: false
            referencedRelation: "compras_insumo_precos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_beneficiamento_compra_insumo_resultante_id_fkey"
            columns: ["compra_insumo_resultante_id"]
            isOneToOne: false
            referencedRelation: "ultima_compra_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_beneficiamento_material_origem_id_fkey"
            columns: ["material_origem_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_beneficiamento_material_resultante_id_fkey"
            columns: ["material_resultante_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_beneficiamento_servico_fornecedor_id_fkey"
            columns: ["servico_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "servico_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_engajamento: {
        Row: {
          atualizado_em: string
          colecao_id: string
          criado_em: string
          custo_por_peca_resolvido: number | null
          id: string
          servico_fornecedor_id: string
          valor_total: number
        }
        Insert: {
          atualizado_em?: string
          colecao_id: string
          criado_em?: string
          custo_por_peca_resolvido?: number | null
          id?: string
          servico_fornecedor_id: string
          valor_total: number
        }
        Update: {
          atualizado_em?: string
          colecao_id?: string
          criado_em?: string
          custo_por_peca_resolvido?: number | null
          id?: string
          servico_fornecedor_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "servico_engajamento_colecao_id_fkey"
            columns: ["colecao_id"]
            isOneToOne: false
            referencedRelation: "colecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_engajamento_servico_fornecedor_id_fkey"
            columns: ["servico_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "servico_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_fornecedor: {
        Row: {
          beneficiamento: boolean
          colecao_id: string | null
          criado_em: string
          custo_por_minuto: number | null
          fornecedor_id: string
          id: string
          modelo_precificacao: string
          servico_id: string
        }
        Insert: {
          beneficiamento?: boolean
          colecao_id?: string | null
          criado_em?: string
          custo_por_minuto?: number | null
          fornecedor_id: string
          id?: string
          modelo_precificacao: string
          servico_id: string
        }
        Update: {
          beneficiamento?: boolean
          colecao_id?: string | null
          criado_em?: string
          custo_por_minuto?: number | null
          fornecedor_id?: string
          id?: string
          modelo_precificacao?: string
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servico_fornecedor_colecao_id_fkey"
            columns: ["colecao_id"]
            isOneToOne: false
            referencedRelation: "colecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_fornecedor_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_fornecedor_categoria: {
        Row: {
          categoria_produto_id: string
          servico_fornecedor_id: string
        }
        Insert: {
          categoria_produto_id: string
          servico_fornecedor_id: string
        }
        Update: {
          categoria_produto_id?: string
          servico_fornecedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servico_fornecedor_categoria_categoria_produto_id_fkey"
            columns: ["categoria_produto_id"]
            isOneToOne: false
            referencedRelation: "categorias_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_fornecedor_categoria_servico_fornecedor_id_fkey"
            columns: ["servico_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "servico_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          codigo: string | null
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          codigo?: string | null
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          codigo?: string | null
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      compras_insumo_precos: {
        Row: {
          aliquota_credito_pct: number | null
          criado_em: string | null
          data_compra: string | null
          fator_metros_por_unidade: number | null
          fornecedor_id: string | null
          id: string | null
          material_id: string | null
          pack_quantidade: number | null
          preco_pago: number | null
          preco_unitario_bruto: number | null
          preco_unitario_liquido: number | null
          quantidade_comprada: number | null
          quantidade_convertida: number | null
          regime_tributario: string | null
          unidade_compra: string | null
        }
        Insert: {
          aliquota_credito_pct?: number | null
          criado_em?: string | null
          data_compra?: string | null
          fator_metros_por_unidade?: number | null
          fornecedor_id?: string | null
          id?: string | null
          material_id?: string | null
          pack_quantidade?: number | null
          preco_pago?: number | null
          preco_unitario_bruto?: never
          preco_unitario_liquido?: never
          quantidade_comprada?: number | null
          quantidade_convertida?: never
          regime_tributario?: string | null
          unidade_compra?: string | null
        }
        Update: {
          aliquota_credito_pct?: number | null
          criado_em?: string | null
          data_compra?: string | null
          fator_metros_por_unidade?: number | null
          fornecedor_id?: string | null
          id?: string | null
          material_id?: string | null
          pack_quantidade?: number | null
          preco_pago?: number | null
          preco_unitario_bruto?: never
          preco_unitario_liquido?: never
          quantidade_comprada?: number | null
          quantidade_convertida?: never
          regime_tributario?: string | null
          unidade_compra?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_insumo_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_insumo_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_atual: {
        Row: {
          material_id: string | null
          saldo_atual: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentos_estoque_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_ultimo_preco: {
        Row: {
          categoria_produto_id: string | null
          criado_em: string | null
          custo_por_minuto_aplicado: number | null
          id: string | null
          preco_unitario: number | null
          produto_id: string | null
          servico_fornecedor_id: string | null
          tempo_minutos: number | null
          valor_calculado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_servicos_categoria_produto_id_fkey"
            columns: ["categoria_produto_id"]
            isOneToOne: false
            referencedRelation: "categorias_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_servicos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_servicos_servico_fornecedor_id_fkey"
            columns: ["servico_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "servico_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_ultimo_preco_geral: {
        Row: {
          categoria_produto_id: string | null
          criado_em: string | null
          custo_por_minuto_aplicado: number | null
          id: string | null
          preco_unitario: number | null
          produto_id: string | null
          servico_fornecedor_id: string | null
          tempo_minutos: number | null
          valor_calculado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_servicos_categoria_produto_id_fkey"
            columns: ["categoria_produto_id"]
            isOneToOne: false
            referencedRelation: "categorias_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_servicos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_servicos_servico_fornecedor_id_fkey"
            columns: ["servico_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "servico_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      ultima_compra_material: {
        Row: {
          aliquota_credito_pct: number | null
          criado_em: string | null
          data_compra: string | null
          fator_metros_por_unidade: number | null
          fornecedor_id: string | null
          id: string | null
          material_id: string | null
          pack_quantidade: number | null
          preco_pago: number | null
          preco_unitario_bruto: number | null
          preco_unitario_liquido: number | null
          quantidade_comprada: number | null
          quantidade_convertida: number | null
          regime_tributario: string | null
          unidade_compra: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_insumo_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_insumo_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fechar_colecao: { Args: { p_colecao_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
