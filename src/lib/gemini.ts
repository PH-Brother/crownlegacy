import { supabase } from "@/integrations/supabase/client";
import { getVersiculoAleatorio } from "./versiculos";

function sanitizarInput(texto: string, maxLen: number = 2000): string {
  return texto.replace(/<[^>]*>/g, "").slice(0, maxLen).trim();
}

interface DadosFinanceiros {
  receitas: number;
  despesas: number;
  saldo: number;
  categorias: Record<string, number>;
  mes: string;
}

export async function gerarAnaliseFinanceira(dados: DadosFinanceiros): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("gemini-proxy", {
      body: {
        tipo: "analise_financeira",
        dados: {
          receitas: dados.receitas,
          despesas: dados.despesas,
          saldo: dados.saldo,
          categorias: dados.categorias,
          mes: sanitizarInput(dados.mes, 50),
        },
      },
    });

    if (error) {
      throw error;
    }

    return data?.resultado || "Não foi possível gerar a análise no momento.";
  } catch {
    const v = getVersiculoAleatorio();
    return `📊 Resumo: Receitas R$ ${dados.receitas.toFixed(2)} | Despesas R$ ${dados.despesas.toFixed(2)} | Saldo R$ ${dados.saldo.toFixed(2)}\n\n💡 ${v.versiculo} — ${v.referencia}`;
  }
}

export async function gerarReflexaoDiaria(): Promise<{
  versiculo: string;
  referencia: string;
  reflexao: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("gemini-proxy", {
      body: { tipo: "reflexao_diaria" },
    });

    if (error) throw error;

    if (data?.resultado) {
      const lines = data.resultado.split("\n").filter((l: string) => l.trim());
      return {
        versiculo: lines[0] || "",
        referencia: lines[1] || "",
        reflexao: lines.slice(2).join("\n") || data.resultado,
      };
    }
    throw new Error("Sem resultado");
  } catch {
    const v = getVersiculoAleatorio();
    return {
      versiculo: v.versiculo,
      referencia: v.referencia,
      reflexao: "Medite nesta palavra e aplique à sua vida financeira hoje.",
    };
  }
}
