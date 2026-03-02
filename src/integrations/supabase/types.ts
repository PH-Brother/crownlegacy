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
          telefone: string | null
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
          telefone?: string | null
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
          telefone?: string | null
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
        Args: { p_codigo_convite: string; p_nome: string }
        Returns: {
          codigo_convite: string
          id: string
          nome: string
        }[]
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
