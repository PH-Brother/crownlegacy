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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_behavior_insights: {
        Row: {
          family_id: string | null
          generated_at: string | null
          id: string
          insight: string
          is_read: boolean | null
          severity: string | null
          type: string
          user_id: string
        }
        Insert: {
          family_id?: string | null
          generated_at?: string | null
          id?: string
          insight: string
          is_read?: boolean | null
          severity?: string | null
          type: string
          user_id: string
        }
        Update: {
          family_id?: string | null
          generated_at?: string | null
          id?: string
          insight?: string
          is_read?: boolean | null
          severity?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      asset_history: {
        Row: {
          asset_id: string
          id: string
          owner_id: string
          recorded_at: string | null
          value: number
        }
        Insert: {
          asset_id: string
          id?: string
          owner_id: string
          recorded_at?: string | null
          value: number
        }
        Update: {
          asset_id?: string
          id?: string
          owner_id?: string
          recorded_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category: string
          created_at: string | null
          currency: string | null
          family_id: string | null
          id: string
          institution: string | null
          is_active: boolean | null
          liquidity: string | null
          name: string
          notes: string | null
          owner_id: string
          type: string
          updated_at: string | null
          value: number
        }
        Insert: {
          category: string
          created_at?: string | null
          currency?: string | null
          family_id?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean | null
          liquidity?: string | null
          name: string
          notes?: string | null
          owner_id: string
          type: string
          updated_at?: string | null
          value?: number
        }
        Update: {
          category?: string
          created_at?: string | null
          currency?: string | null
          family_id?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean | null
          liquidity?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          type?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          cancelar_ao_fim: boolean | null
          created_at: string | null
          familia_id: string | null
          id: string
          periodo_fim: string | null
          periodo_inicio: string | null
          plano: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelar_ao_fim?: boolean | null
          created_at?: string | null
          familia_id?: string | null
          id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          plano?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelar_ao_fim?: boolean | null
          created_at?: string | null
          familia_id?: string | null
          id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          plano?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      behavior_profiles: {
        Row: {
          created_at: string | null
          discipline_score: number | null
          family_id: string | null
          id: string
          last_analyzed_at: string | null
          risk_profile: string | null
          saving_pattern: string | null
          spending_pattern: string | null
          updated_at: string | null
          user_id: string
          wealth_growth_rate: number | null
        }
        Insert: {
          created_at?: string | null
          discipline_score?: number | null
          family_id?: string | null
          id?: string
          last_analyzed_at?: string | null
          risk_profile?: string | null
          saving_pattern?: string | null
          spending_pattern?: string | null
          updated_at?: string | null
          user_id: string
          wealth_growth_rate?: number | null
        }
        Update: {
          created_at?: string | null
          discipline_score?: number | null
          family_id?: string | null
          id?: string
          last_analyzed_at?: string | null
          risk_profile?: string | null
          saving_pattern?: string | null
          spending_pattern?: string | null
          updated_at?: string | null
          user_id?: string
          wealth_growth_rate?: number | null
        }
        Relationships: []
      }
      documentos: {
        Row: {
          analise_resultado: string | null
          created_at: string | null
          familia_id: string | null
          id: string
          nome_original: string
          status: string | null
          storage_path: string
          tipo: string
          user_id: string
        }
        Insert: {
          analise_resultado?: string | null
          created_at?: string | null
          familia_id?: string | null
          id?: string
          nome_original: string
          status?: string | null
          storage_path: string
          tipo: string
          user_id: string
        }
        Update: {
          analise_resultado?: string | null
          created_at?: string | null
          familia_id?: string | null
          id?: string
          nome_original?: string
          status?: string | null
          storage_path?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      educacao_modulos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          conteudo: Json
          created_at: string | null
          duracao_estimada: number | null
          id: string
          nivel: string | null
          ordem: number | null
          pontos_recompensa: number | null
          subtitulo: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          conteudo: Json
          created_at?: string | null
          duracao_estimada?: number | null
          id?: string
          nivel?: string | null
          ordem?: number | null
          pontos_recompensa?: number | null
          subtitulo?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          conteudo?: Json
          created_at?: string | null
          duracao_estimada?: number | null
          id?: string
          nivel?: string | null
          ordem?: number | null
          pontos_recompensa?: number | null
          subtitulo?: string | null
          titulo?: string
        }
        Relationships: []
      }
      familias: {
        Row: {
          codigo_convite: string | null
          created_at: string | null
          data_fim_trial: string | null
          data_inicio_plano: string | null
          id: string
          limite_usuarios: number | null
          nome: string
          plano: string | null
        }
        Insert: {
          codigo_convite?: string | null
          created_at?: string | null
          data_fim_trial?: string | null
          data_inicio_plano?: string | null
          id?: string
          limite_usuarios?: number | null
          nome: string
          plano?: string | null
        }
        Update: {
          codigo_convite?: string | null
          created_at?: string | null
          data_fim_trial?: string | null
          data_inicio_plano?: string | null
          id?: string
          limite_usuarios?: number | null
          nome?: string
          plano?: string | null
        }
        Relationships: []
      }
      family_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          familia_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          familia_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          familia_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_scores: {
        Row: {
          calculated_at: string | null
          family_id: string | null
          id: string
          level: string | null
          pillar_debt_ratio: number | null
          pillar_goals: number | null
          pillar_liquidity: number | null
          pillar_providence: number | null
          pillar_saving: number | null
          pillar_wealth_growth: number | null
          recommendations: Json | null
          score_total: number
          user_id: string
        }
        Insert: {
          calculated_at?: string | null
          family_id?: string | null
          id?: string
          level?: string | null
          pillar_debt_ratio?: number | null
          pillar_goals?: number | null
          pillar_liquidity?: number | null
          pillar_providence?: number | null
          pillar_saving?: number | null
          pillar_wealth_growth?: number | null
          recommendations?: Json | null
          score_total?: number
          user_id: string
        }
        Update: {
          calculated_at?: string | null
          family_id?: string | null
          id?: string
          level?: string | null
          pillar_debt_ratio?: number | null
          pillar_goals?: number | null
          pillar_liquidity?: number | null
          pillar_providence?: number | null
          pillar_saving?: number | null
          pillar_wealth_growth?: number | null
          recommendations?: Json | null
          score_total?: number
          user_id?: string
        }
        Relationships: []
      }
      gamificacao_eventos: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          pontos_ganhos: number
          tipo_evento: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          pontos_ganhos: number
          tipo_evento: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          pontos_ganhos?: number
          tipo_evento?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gamificacao_eventos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_analises: {
        Row: {
          created_at: string | null
          familia_id: string | null
          id: string
          modelo_usado: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          resultado: Json
          tipo_analise: string
          tokens_usados: number | null
        }
        Insert: {
          created_at?: string | null
          familia_id?: string | null
          id?: string
          modelo_usado?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          resultado: Json
          tipo_analise: string
          tokens_usados?: number | null
        }
        Update: {
          created_at?: string | null
          familia_id?: string | null
          id?: string
          modelo_usado?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          resultado?: Json
          tipo_analise?: string
          tokens_usados?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_analises_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_financeiras: {
        Row: {
          categoria: string | null
          created_at: string | null
          criador_id: string | null
          descricao: string | null
          familia_id: string | null
          id: string
          prazo_final: string | null
          status: string | null
          titulo: string
          valor_alvo: number
          valor_atual: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          criador_id?: string | null
          descricao?: string | null
          familia_id?: string | null
          id?: string
          prazo_final?: string | null
          status?: string | null
          titulo: string
          valor_alvo: number
          valor_atual?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          criador_id?: string | null
          descricao?: string | null
          familia_id?: string | null
          id?: string
          prazo_final?: string | null
          status?: string | null
          titulo?: string
          valor_alvo?: number
          valor_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_financeiras_criador_id_fkey"
            columns: ["criador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_financeiras_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      net_worth_snapshots: {
        Row: {
          created_at: string | null
          family_id: string | null
          id: string
          net_worth: number | null
          snapshot_data: Json | null
          snapshot_date: string
          total_assets: number
          total_liabilities: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          family_id?: string | null
          id?: string
          net_worth?: number | null
          snapshot_data?: Json | null
          snapshot_date: string
          total_assets?: number
          total_liabilities?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          family_id?: string | null
          id?: string
          net_worth?: number | null
          snapshot_data?: Json | null
          snapshot_date?: string
          total_assets?: number
          total_liabilities?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badges: Json | null
          created_at: string | null
          data_nascimento: string | null
          familia_id: string | null
          id: string
          nivel_gamificacao: number | null
          nome_completo: string
          pontos_total: number | null
          role: string | null
          subscription_status: string | null
          subscription_tier: string | null
          telefone: string | null
          tema_preferido: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: Json | null
          created_at?: string | null
          data_nascimento?: string | null
          familia_id?: string | null
          id: string
          nivel_gamificacao?: number | null
          nome_completo: string
          pontos_total?: number | null
          role?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          telefone?: string | null
          tema_preferido?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges?: Json | null
          created_at?: string | null
          data_nascimento?: string | null
          familia_id?: string | null
          id?: string
          nivel_gamificacao?: number | null
          nome_completo?: string
          pontos_total?: number | null
          role?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          telefone?: string | null
          tema_preferido?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      progresso_educacao: {
        Row: {
          completed_at: string | null
          concluido: boolean | null
          id: string
          modulo_id: string | null
          progresso: number | null
          started_at: string | null
          tempo_gasto: number | null
          usuario_id: string | null
        }
        Insert: {
          completed_at?: string | null
          concluido?: boolean | null
          id?: string
          modulo_id?: string | null
          progresso?: number | null
          started_at?: string | null
          tempo_gasto?: number | null
          usuario_id?: string | null
        }
        Update: {
          completed_at?: string | null
          concluido?: boolean | null
          id?: string
          modulo_id?: string | null
          progresso?: number | null
          started_at?: string | null
          tempo_gasto?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progresso_educacao_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "educacao_modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_educacao_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reflexoes_diarias: {
        Row: {
          aplicacao_pratica: string | null
          created_at: string | null
          data_publicacao: string
          id: string
          referencia: string
          reflexao: string
          tags: string[] | null
          versiculo: string
        }
        Insert: {
          aplicacao_pratica?: string | null
          created_at?: string | null
          data_publicacao: string
          id?: string
          referencia: string
          reflexao: string
          tags?: string[] | null
          versiculo: string
        }
        Update: {
          aplicacao_pratica?: string | null
          created_at?: string | null
          data_publicacao?: string
          id?: string
          referencia?: string
          reflexao?: string
          tags?: string[] | null
          versiculo?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transacoes: {
        Row: {
          categoria: string
          created_at: string | null
          data_transacao: string
          descricao: string | null
          familia_id: string | null
          id: string
          recorrente: boolean | null
          tags: string[] | null
          tipo: string
          usuario_id: string | null
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string | null
          data_transacao?: string
          descricao?: string | null
          familia_id?: string | null
          id?: string
          recorrente?: boolean | null
          tags?: string[] | null
          tipo: string
          usuario_id?: string | null
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string | null
          data_transacao?: string
          descricao?: string | null
          familia_id?: string | null
          id?: string
          recorrente?: boolean | null
          tags?: string[] | null
          tipo?: string
          usuario_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string | null
          file_id: string | null
          id: string
          merchant: string
          source: string | null
          transaction_date: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_id?: string | null
          id?: string
          merchant: string
          source?: string | null
          transaction_date: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_id?: string | null
          id?: string
          merchant?: string
          source?: string | null
          transaction_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_url: string | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wealth_goals: {
        Row: {
          created_at: string | null
          current_value: number | null
          description: string | null
          family_id: string | null
          id: string
          linked_asset_id: string | null
          motivational_verse: string | null
          priority: number | null
          status: string | null
          target_date: string | null
          target_value: number
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          family_id?: string | null
          id?: string
          linked_asset_id?: string | null
          motivational_verse?: string | null
          priority?: number | null
          status?: string | null
          target_date?: string | null
          target_value: number
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          family_id?: string | null
          id?: string
          linked_asset_id?: string | null
          motivational_verse?: string | null
          priority?: number | null
          status?: string | null
          target_date?: string | null
          target_value?: number
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_goals_linked_asset_id_fkey"
            columns: ["linked_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_gamification_points: {
        Args: { p_descricao: string; p_pontos: number; p_tipo_evento: string }
        Returns: undefined
      }
      create_family_with_admin: {
        Args: { p_nome: string; p_user_id: string }
        Returns: Json
      }
      get_user_familia_id:
        | { Args: never; Returns: string }
        | { Args: { user_id: string }; Returns: string }
      join_family_with_code: {
        Args: { p_codigo_convite: string }
        Returns: {
          id: string
          nome: string
        }[]
      }
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
