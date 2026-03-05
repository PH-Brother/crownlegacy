const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key)
      return new Response(JSON.stringify({ error: "sem chave" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    const b = await req.json();
    if (!b.base64Data || !b.mimeType)
      return new Response(JSON.stringify({ error: "parametros ausentes" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    console.log("arquivo:", b.fileName, b.mimeType, b.base64Data.length);

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + key,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: b.mimeType, data: b.base64Data } },
                {
                  text: 'Voce e um extrator de dados financeiros. Analise o documento e extraia APENAS dados VISIVEIS. NUNCA invente. Retorne SOMENTE JSON sem markdown sem backticks: {"tipo_documento":"fatura_cartao|extrato|comprovante","emissor":"nome","titular":"nome ou null","valor_total":0.00,"vencimento":"DD/MM/AAAA ou null","periodo":"MM/AAAA ou null","transacoes":[{"data":"DD/MM/AAAA","descricao":"nome exato","valor":0.00,"categoria":"Alimentacao|Transporte|Moradia|Saude|Educacao|Lazer|Assinaturas|Outros"}],"resumo_categorias":[{"categoria":"nome","total":0.00,"percentual":0}],"insights":["i1","i2","i3"],"alerta":"texto ou null","versiculo":"texto ou null","versiculo_ref":"ref ou null"}',
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      },
    );

    const t = await r.text();
    console.log("gemini status:", r.status);
    if (!r.ok)
      return new Response(JSON.stringify({ error: "gemini " + r.status, details: t.substring(0, 300) }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    const d = JSON.parse(t);
    const txt = d.candidates[0].content.parts[0].text;
    if (!txt)
      return new Response(JSON.stringify({ error: "sem conteudo" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    const clean = txt.split("```json").join("").split("```").join("").trim();

    let res;
    try {
      res = JSON.parse(clean);
    } catch (e) {
      return new Response(JSON.stringify({ error: "json invalido", raw: clean.substring(0, 200) }), {
        status: 422,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    console.log("transacoes:", res.transacoes ? res.transacoes.length : 0);
    return new Response(JSON.stringify({ resultado: res }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
