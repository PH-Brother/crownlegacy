const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY nao configurada" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + key;
    let requestBody = {};

    if (body.base64Data && body.mimeType) {
      console.log("Branch: analise_documento", body.fileName, body.mimeType, body.base64Data.length);
      requestBody = {
        contents: [
          {
            parts: [
              { inline_data: { mime_type: body.mimeType, data: body.base64Data } },
              {
                text: 'Voce e um extrator de dados financeiros especialista em faturas de cartao de credito brasileiras. REGRA DE ESCOPO: Extrair APENAS transacoes da secao chamada "Lancamentos: compras e saques" ou "Lancamentos atuais". IGNORAR completamente a secao "Compras parceladas - proximas faturas" pois e informativa e causaria duplicidade. REGRA DE DATA: Datas na fatura aparecem no formato DD/MM sem ano. O ano correto e o ano do periodo da fatura. Exemplo: fatura de janeiro/2026, data 13/12 = 13/12/2025. Se o mes da transacao for maior que o mes da fatura, o ano e o anterior. Use sempre DD/MM/AAAA. REGRA DE PARCELAMENTO: Faturas Itau mostram parcelas coladas ao nome assim: "PP *LIVE ROUPA10/10" = parcela 10 de 10, "MP *BRUNAZANETIC 04/05" = parcela 4 de 5, "DM *TEMU 02/06" = parcela 2 de 6, "SHEIN *ALL IN COL02/03" = parcela 2 de 3. O padrao e: NOME_LOJA seguido de DD/MM onde DD = numero da parcela atual e MM = total de parcelas. Quando identificar parcela, a data_transacao DEVE ser a data de vencimento da fatura (campo vencimento), NAO a data original da compra. Preservar o numero da parcela na descricao. REGRA DE CARTOES ADICIONAIS: A fatura pode ter multiplos cartoes com titulares diferentes. Incluir o nome do titular do cartao na descricao da transacao entre parenteses. Exemplo: "AMAZON (PAULO H CAPUCHINHO)". REGRA DE VALIDACAO: O campo valor_total deve ser igual ao valor de "Total dos lancamentos atuais" da fatura. Se divergir, revisar as transacoes extraidas. Retorne JSON no formato exato: {"tipo_documento":"fatura_cartao","emissor":"Itau","titular":"nome do titular principal","valor_total":0.00,"vencimento":"DD/MM/AAAA","periodo":"MM/AAAA","transacoes":[{"data":"DD/MM/AAAA","descricao":"nome exato com titular se adicional","valor":0.00,"categoria":"Alimentacao|Transporte|Moradia|Saude|Educacao|Lazer|Assinaturas|Vestuario|Investimentos|Receita|Outros","parcela":"X/Y ou null"}],"resumo_categorias":[{"categoria":"nome","total":0.00,"percentual":0}],"insights":["i1","i2","i3"],"alerta":"texto ou null","versiculo":"texto ou null","versiculo_ref":"ref ou null"}',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 65536,
          responseMimeType: "application/json",
        },
      };
    } else if (body.prompt) {
      console.log("Branch: prompt_livre");
      requestBody = {
        contents: [{ parts: [{ text: body.prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      };
    } else if (body.tipo === "analise_financeira") {
      console.log("Branch: analise_financeira");
      const dados = body.dados ? JSON.stringify(body.dados) : "sem dados";
      requestBody = {
        contents: [
          {
            parts: [
              {
                text:
                  "Voce e um consultor financeiro cristao. Analise os dados e retorne insights em markdown com emojis. Dados: " +
                  dados,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      };
    } else if (body.tipo === "reflexao_diaria") {
      console.log("Branch: reflexao_diaria");
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: "Gere uma reflexao diaria sobre financas e fe crista. Inclua versiculo biblico, aplicacao pratica e dica financeira. Responda em markdown com emojis.",
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      };
    } else {
      return new Response(
        JSON.stringify({ error: "Parametros invalidos. Envie base64Data+mimeType, prompt, ou tipo." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const responseText = await geminiRes.text();
    console.log("Gemini status:", geminiRes.status);

    if (!geminiRes.ok) {
      return new Response(
        JSON.stringify({ error: "Gemini error " + geminiRes.status, details: responseText.substring(0, 300) }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const parsed = JSON.parse(responseText);
    const finishReason = parsed.candidates?.[0]?.finishReason;
    console.log("finishReason:", finishReason);

    if (finishReason === "MAX_TOKENS") {
      return new Response(JSON.stringify({ error: "Documento muito grande. Tente um arquivo menor." }), {
        status: 422,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const part = parsed.candidates?.[0]?.content?.parts?.[0];
    if (!part) {
      return new Response(JSON.stringify({ error: "Sem conteudo retornado pelo Gemini" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (body.base64Data && body.mimeType) {
      let resultado;
      if (part.text !== undefined) {
        const s1 = part.text.split("```json").join("");
        const s2 = s1.split("```").join("");
        const s3 = s2.trim();
        try {
          resultado = JSON.parse(s3);
        } catch (e1) {
          const inicio = s3.indexOf("{");
          const fim = s3.lastIndexOf("}");
          if (inicio !== -1 && fim > inicio) {
            try {
              resultado = JSON.parse(s3.substring(inicio, fim + 1));
            } catch (e2) {
              return new Response(JSON.stringify({ error: "JSON invalido", raw: s3.substring(0, 300) }), {
                status: 422,
                headers: { ...cors, "Content-Type": "application/json" },
              });
            }
          }
        }
      } else {
        resultado = part;
      }

      if (!resultado) {
        return new Response(JSON.stringify({ error: "Resultado vazio apos parse" }), {
          status: 422,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      console.log("Transacoes extraidas:", resultado.transacoes ? resultado.transacoes.length : 0);
      return new Response(JSON.stringify({ resultado: resultado }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const texto = part.text;
    if (!texto) {
      return new Response(JSON.stringify({ error: "Texto vazio retornado" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ resultado: texto }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Erro geral:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
