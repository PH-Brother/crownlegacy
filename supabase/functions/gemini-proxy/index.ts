const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY nao configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { base64Data, mimeType, fileName } = body

    if (!base64Data || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Parametros obrigatorios ausentes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Arquivo recebido:', fileName, mimeType, base64Data.length)

    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              },
              {
                text: 'Voce e um extrator de dados financeiros especialista. Analise o documento e extraia APENAS dados VISIVEIS. NUNCA invente dados. Se nao estiver claro use null. Retorne SOMENTE JSON puro sem markdown sem explicacoes sem backticks. Formato exato: {"tipo_documento":"fatura_cartao|extrato|comprovante|nota_fiscal","emissor":"nome","titular":"nome ou null","valor_total":0.00,"vencimento":"DD/MM/AAAA ou null","periodo":"MM/AAAA ou null","transacoes":[{"data":"DD/MM/AAAA","descricao":"nome exato","valor":0.00,"categoria":"Alimentacao|Transporte|Moradia|Saude|Educacao|Lazer|Assinaturas|Outros"}],"resumo_categorias":[{"categoria":"nome","total":0.00,"percentual":0}],"insights":["insight1","insight2","insight3"],"alerta":"alerta ou null","versiculo":"versiculo ou null","versiculo_ref":"ref ou null"}'
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192
          }
        })
      }
    )

    const responseText = await geminiRes.text()
    console.log('Gemini status:', geminiRes.status)

    if (!geminiRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Gemini error ' + geminiRes.status, details: responseText.substring(0, 300) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const parsed = JSON.parse(responseText)
    const texto = parsed.candidates?.[0]?.content?.parts?.[0]?.text

    if (!texto) {
      return new Response(
        JSON.stringify({ error: 'Sem conteudo retornado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jsonLimpo = texto
      .split('```json').join('')
      .split('```').join('')
      .trim()

    let resultado
    try {
      resultado = JSON.parse(jsonLimpo)
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: 'JSON invalido', raw: jsonLimpo.substring(0, 300) }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Transacoes extraidas:', resultado.transacoes?.length ?? 0)

    return new Response(
      JSON.stringify({ resultado }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Erro:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
