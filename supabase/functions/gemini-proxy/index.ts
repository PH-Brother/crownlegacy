import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { tipo?: string; dados?: Record<string, unknown> };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tipo, dados } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (tipo === "analise_financeira") {
      const d = dados as Record<string, unknown> | undefined;
      systemPrompt = `Você é um conselheiro financeiro cristão sábio e acolhedor. Analise os dados financeiros da família e dê conselhos práticos baseados em princípios bíblicos. Seja direto, use emojis, e termine com um versículo bíblico relevante. Responda em português do Brasil.`;
      userPrompt = `Analise estes dados financeiros do mês de ${String(d?.mes || "atual").slice(0, 50)}:
- Receitas: R$ ${Number(d?.receitas || 0).toFixed(2)}
- Despesas: R$ ${Number(d?.despesas || 0).toFixed(2)}  
- Saldo: R$ ${Number(d?.saldo || 0).toFixed(2)}
- Gastos por categoria: ${JSON.stringify(d?.categorias || {}).slice(0, 2000)}

Dê uma análise breve (máximo 300 palavras) com:
1. Avaliação geral
2. Pontos de atenção
3. Sugestões práticas
4. Versículo bíblico relevante`;
    } else if (tipo === "reflexao_diaria") {
      systemPrompt = `Você é um pastor que gera reflexões financeiras bíblicas diárias. Responda em português do Brasil.`;
      userPrompt = `Gere uma reflexão financeira bíblica para hoje. Formato:
Linha 1: O versículo bíblico completo
Linha 2: A referência (ex: Provérbios 21:5)
Linhas seguintes: Uma reflexão prática de 2-3 frases sobre como aplicar este versículo à vida financeira.`;
    } else if (tipo === "analise_fatura") {
      const d = dados as Record<string, unknown> | undefined;
      systemPrompt = `Você é um assistente financeiro que analisa faturas e documentos financeiros. Responda em português do Brasil.`;
      userPrompt = `O usuário fez upload de um arquivo (${String(d?.filename || "documento").slice(0, 100)}). Gere uma análise simulada com sugestões de como categorizar os gastos encontrados e dicas de economia.`;
    } else {
      return new Response(JSON.stringify({ error: "Tipo de análise não reconhecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI Gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao processar análise" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";

    return new Response(JSON.stringify({ resultado: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gemini-proxy error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
