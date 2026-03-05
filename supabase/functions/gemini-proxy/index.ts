const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors })
  }

  try {
    const key = Deno.env.get("GEMINI_API_KEY")
    if (!key) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY nao configurada" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    const body = await req.json()
    const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + key
    let contents = []

    // BRANCH 1: Análise de documento (PDF/imagem)
    if (body.base64Data && body.mimeType) {
      console.log("Branch: analise_documento", body.fileName, body.mimeType)
      contents = [{
        parts: [
          { inline_data: { mime_type: body.mimeType, data: body.base64Data } },
          { text: "Voce e um extrator de dados financeiros especialista. Analise o documento e extraia APENAS dados VISIVEIS. NUNCA invente dados. Retorne SOMENTE JSON puro sem markdown sem backticks. Formato: {\"tipo_documento\":\"fatura_cartao|extrato|comprovante|nota_fiscal\",\"emissor\":\"nome\",\"titular\":\"nome ou null\",\"valor_total\":0.00,\"vencimento\":\"DD/MM/AAAA ou null\",\"periodo\":\"MM/AAAA ou null\",\"transacoes\":[{\"data\":\"DD/MM/AAAA\",\"descricao\":\"nome exato\",\"valor\":0.00,\"categoria\":\"Alimentacao|Transporte|Moradia|Saude|Educacao|Lazer|Assinaturas|Outros\"}],\"resumo_categorias\":[{\"categoria\":\"nome\",\"total\":0.00,\"percentual\":0}],\"insights\":[\"i1\",\"i2\",\"i3\"],\"alerta\":\"texto ou null\",\"versiculo\":\"texto ou null\",\"versiculo_ref\":\"ref ou null\"}" }
        ]
      }]
    }
    // BRANCH 2: Prompt livre (Dicas de Sabedoria, chat)
    else if (body.prompt) {
      console.log("Branch: prompt_livre")
      contents = [{ parts: [{ text: body.prompt }] }]
    }
    // BRANCH 3: Análise financeira mensal
    else if (body.tipo === "analise_financeira") {
      console.log("Branch: analise_financeira")
      const dados = body.dados ? JSON.stringify(body.dados) : "sem dados"
      contents = [{
        parts: [{
          text: "Voce e um consultor financeiro cristao especialista. Analise os seguintes dados financeiros mensais e retorne insights em markdown formatado com emojis. Dados: " + dados
        }]
      }]
    }
    // BRANCH 4: Reflexao diaria
    else if (body.tipo === "reflexao_diaria") {
      console.log("Branch: reflexao_diaria")
      contents = [{
        parts: [{
          text: "Voce e um conselheiro financeiro cristao. Gere uma reflexao diaria curta sobre financas e fe crista. Inclua um versiculo biblico relevante, uma aplicacao pratica e uma dica financeira. Responda em markdown com emojis."
        }]
      }]
    }
    // Parametros invalidos
    else {
      return new Response(
        JSON.stringify({ error: "Parametros invalidos. Envie base64Data+mimeType, prompt, ou tipo." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: contents,
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
      })
    })

    const responseText = await geminiRes.text()
    console.log("Gemini status:", geminiRes.status)

    if (!geminiRes.ok) {
      return new Response(
        JSON.stringify({ error: "Gemini error " + geminiRes.status, details: responseText.substring(0, 300) }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    const parsed = JSON.parse(responseText)
    const texto = parsed.candidates[0].content.parts[0].text

    if (!texto) {
      return new Response(
        JSON.stringify({ error: "Sem conteudo retornado" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Para análise de documento: fazer parse do JSON
    if (body.base64Data && body.mimeType) {
      const clean = texto.split("```json").join("").split("```").join("").trim()
      let resultado
      try {
        resultado = JSON.parse(clean)
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "JSON invalido", raw: clean.substring(0, 300) }),
          { status: 422, headers: { ...cors, "Content-Type": "application/json" } }
        )
      }
      console.log("Transacoes extraidas:", resultado.transacoes ? resultado.transacoes.length : 0)
      return new Response(
        JSON.stringify({ resultado: resultado }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Para outros branches: retornar texto direto
    return new Response(
      JSON.stringify({ resultado: texto }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    )
  } catch (e) {
    console.error("Erro:", e.message)
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    )
  }
})
