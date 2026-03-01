import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tipo, dados } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (tipo === "analise_financeira") {
      systemPrompt = `Você é um conselheiro financeiro cristão sábio e acolhedor. Analise os dados financeiros da família e dê conselhos práticos baseados em princípios bíblicos. Seja direto, use emojis, e termine com um versículo bíblico relevante. Responda em português do Brasil.`;
      userPrompt = `Analise estes dados financeiros do mês de ${dados?.mes || "atual"}:
- Receitas: R$ ${dados?.receitas?.toFixed(2) || "0.00"}
- Despesas: R$ ${dados?.despesas?.toFixed(2) || "0.00"}  
- Saldo: R$ ${dados?.saldo?.toFixed(2) || "0.00"}
- Gastos por categoria: ${JSON.stringify(dados?.categorias || {})}

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
      systemPrompt = `Você é um assistente financeiro que analisa faturas e documentos financeiros. Responda em português do Brasil.`;
      userPrompt = `O usuário fez upload de um arquivo (${dados?.filename || "documento"}). Gere uma análise simulada com sugestões de como categorizar os gastos encontrados e dicas de economia.`;
    } else {
      throw new Error("Tipo de análise não reconhecido");
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
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI Gateway error:", status, text);
      throw new Error(`Gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";

    return new Response(JSON.stringify({ resultado: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gemini-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
