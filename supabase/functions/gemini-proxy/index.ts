const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function callGemini(key: string, contents: unknown[]) {
  const r = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }),
  });

  const t = await r.text();
  console.log("Gemini status:", r.status);

  if (!r.ok) {
    throw new Error(`gemini ${r.status}: ${t.substring(0, 300)}`);
  }

  const d = JSON.parse(t);
  const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error("sem conteudo do Gemini");
  return txt;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key)
      return new Response(JSON.stringify({ error: "sem chave" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const b = await req.json();

    // ── BRANCH 1: Análise de documento (PDF/imagem) ──
    if (b.base64Data && b.mimeType) {
      console.log("arquivo:", b.fileName, b.mimeType, b.base64Data.length);

      const txt = await callGemini(key, [
        {
          parts: [
            { inline_data: { mime_type: b.mimeType, data: b.base64Data } },
            {
              text: 'Voce e um extrator de dados financeiros. Analise o documento e extraia APENAS dados VISIVEIS. NUNCA invente. Retorne SOMENTE JSON sem markdown sem backticks: {"tipo_documento":"fatura_cartao|extrato|comprovante","emissor":"nome","titular":"nome ou null","valor_total":0.00,"vencimento":"DD/MM/AAAA ou null","periodo":"MM/AAAA ou null","transacoes":[{"data":"DD/MM/AAAA","descricao":"nome exato","valor":0.00,"categoria":"Alimentacao|Transporte|Moradia|Saude|Educacao|Lazer|Assinaturas|Outros"}],"resumo_categorias":[{"categoria":"nome","total":0.00,"percentual":0}],"insights":["i1","i2","i3"],"alerta":"texto ou null","versiculo":"texto ou null","versiculo_ref":"ref ou null"}',
            },
          ],
        },
      ]);

      const clean = txt.split("```json").join("").split("```").join("").trim();
      let res;
      try {
        res = JSON.parse(clean);
      } catch {
        return new Response(
          JSON.stringify({ error: "json invalido", raw: clean.substring(0, 200) }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("transacoes:", res.transacoes ? res.transacoes.length : 0);
      return new Response(JSON.stringify({ resultado: res }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BRANCH 2: Prompt direto (Dicas de Sabedoria / Conselho) ──
    if (b.prompt) {
      const txt = await callGemini(key, [{ parts: [{ text: b.prompt }] }]);
      return new Response(JSON.stringify({ resultado: txt, text: txt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BRANCH 3: Análise financeira mensal ──
    if (b.tipo === "analise_financeira" && b.dados) {
      const d = b.dados;
      const prompt = `Você é um Consultor Financeiro Cristão. Analise os dados financeiros abaixo e forneça uma análise detalhada com insights, alertas e um versículo bíblico relevante.

Dados do mês ${d.mes || "atual"}:
- Receitas: R$ ${d.receitas?.toFixed(2) || "0.00"}
- Despesas: R$ ${d.despesas?.toFixed(2) || "0.00"}
- Saldo: R$ ${d.saldo?.toFixed(2) || "0.00"}
- Categorias: ${JSON.stringify(d.categorias || {})}

Responda em português brasileiro com formatação Markdown. Inclua: resumo, pontos positivos, alertas, dicas práticas e um versículo bíblico aplicado às finanças.`;

      const txt = await callGemini(key, [{ parts: [{ text: prompt }] }]);
      return new Response(JSON.stringify({ resultado: txt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BRANCH 4: Reflexão diária ──
    if (b.tipo === "reflexao_diaria") {
      const prompt =
        "Você é um conselheiro financeiro cristão. Gere uma reflexão diária curta com: 1) Um versículo bíblico sobre finanças, mordomia ou sabedoria (na primeira linha). 2) A referência bíblica (na segunda linha). 3) Uma reflexão prática de 2-3 frases aplicando o versículo à vida financeira (nas linhas seguintes). Responda em português brasileiro.";

      const txt = await callGemini(key, [{ parts: [{ text: prompt }] }]);
      return new Response(JSON.stringify({ resultado: txt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Nenhum branch correspondeu ──
    return new Response(JSON.stringify({ error: "parametros ausentes" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Erro:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
