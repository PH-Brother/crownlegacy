const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function aguardarFileAtivo(
  fileName: string,
  key: string
): Promise<boolean> {
  const maxTentativas = 10;
  for (let i = 0; i < maxTentativas; i++) {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/" +
        fileName +
        "?key=" +
        key
    );
    if (!res.ok) return false;
    const data = await res.json();
    if (data.state === "ACTIVE") return true;
    if (data.state === "FAILED") return false;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY nao configurada" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const MODEL = "gemini-2.5-flash";
    const GEMINI_BASE =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      MODEL +
      ":generateContent?key=" +
      key;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BRANCH 1: Documento via signed URL
    // Suporta: PDF, JPEG, PNG, WEBP, HEIC
    // STREAMING — sem carregar arquivo em RAM
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (body.signedUrl && body.mimeType) {
      console.log("Branch: analise_documento", body.fileName, body.mimeType);

      const MIME_SUPORTADOS = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ];
      const mimeNormalizado = body.mimeType.toLowerCase().trim();
      if (!MIME_SUPORTADOS.includes(mimeNormalizado)) {
        return new Response(
          JSON.stringify({
            error:
              "Tipo de arquivo nao suportado: " +
              body.mimeType +
              ". Use PDF, JPEG, PNG ou WEBP.",
          }),
          { status: 415, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // HEAD para tamanho
      const headRes = await fetch(body.signedUrl, { method: "HEAD" });
      const contentLength = headRes.headers.get("content-length") || "0";
      console.log("Tamanho:", contentLength, "bytes | Tipo:", mimeNormalizado);

      // Stream direto — sem arrayBuffer
      const fileRes = await fetch(body.signedUrl);
      if (!fileRes.ok || !fileRes.body) {
        return new Response(
          JSON.stringify({ error: "Erro ao acessar arquivo: " + fileRes.status }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // Upload streaming para Google Files API
      const uploadHeaders: Record<string, string> = {
        "X-Goog-Upload-Protocol": "raw",
        "X-Goog-Upload-Header-Content-Type": mimeNormalizado,
        "Content-Type": mimeNormalizado,
      };
      if (contentLength !== "0") {
        uploadHeaders["Content-Length"] = contentLength;
      }

      const uploadRes = await fetch(
        "https://generativelanguage.googleapis.com/upload/v1beta/files?key=" + key,
        {
          method: "POST",
          headers: uploadHeaders,
          body: fileRes.body,
        }
      );

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.text();
        console.error("Files API error:", uploadErr.substring(0, 300));
        return new Response(
          JSON.stringify({
            error: "Erro no upload para Google Files API: " + uploadRes.status,
            detalhe: uploadErr.substring(0, 200),
          }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const uploadData = await uploadRes.json();
      const fileUri = uploadData.file?.uri;
      const fileNameApi = uploadData.file?.name;

      if (!fileUri || !fileNameApi) {
        return new Response(
          JSON.stringify({
            error: "URI nao retornada pela Files API",
            raw: JSON.stringify(uploadData).substring(0, 200),
          }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      console.log("File URI:", fileUri);

      const ativo = await aguardarFileAtivo(fileNameApi, key);
      if (!ativo) {
        return new Response(
          JSON.stringify({
            error: "Arquivo nao ficou disponivel na Files API. Tente novamente.",
          }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const promptTexto = `Voce e um extrator de dados financeiros especialista em documentos brasileiros.
Analise o documento (PDF ou imagem fotografada) e extraia APENAS dados VISIVEIS. NUNCA invente dados. Se ilegivel: null.

IDENTIFICACAO DO TIPO:
- fatura_cartao: fatura de cartao de credito de qualquer banco brasileiro (Itau, Bradesco, Nubank, Santander, C6, Inter, XP, BTG, Caixa, BB, Sicredi, Sicoob e outros)
- extrato_bancario: extrato de conta corrente ou poupanca
- comprovante: PIX, TED, DOC, boleto, recibo, cupom fiscal
- nota_fiscal: NF-e ou cupom fiscal de estabelecimento

REGRAS FATURA DE CARTAO:
ESCOPO: Extrair APENAS lancamentos da secao atual. Nomes comuns da secao: "Lancamentos", "Compras", "Gastos do periodo", "Lancamentos nacionais". IGNORAR COMPLETAMENTE: secao "Proximas faturas", "Parcelamentos futuros", "Compras parceladas proximas faturas" — sao informativas e causariam duplicidade.

REGRA DE MES — CRITICA: Cartao de credito cobra no mes SEGUINTE a compra. Usar SEMPRE a data de vencimento como referencia do mes de lancamento de TODAS as transacoes da fatura. Exemplo: vencimento 15/02/2026 → data_lancamento = "02/2026" para TODAS as transacoes, independente da data da compra.

REGRA DE DATA INDIVIDUAL: Campo "data" = data real da compra (DD/MM/AAAA) para historico. Datas DD/MM sem ano: usar ano do periodo da fatura. Se mes da transacao > mes da fatura: ano e o anterior.

REGRA DE PARCELAMENTO: Itau/Bradesco: padrao NOMEDD/MM colado. Exemplo: AMAZON 03/06 = parcela 3 de 6. data_lancamento = mes do vencimento da fatura atual. parcela = "3/6". Nubank/C6/Inter/Santander: texto "Parcela X de Y" na descricao. data_lancamento = mes do vencimento da fatura atual. parcela = "X/Y". Para TODOS os bancos: preservar numero da parcela no campo "parcela" no formato "X/Y".

CARTOES ADICIONAIS: incluir nome do titular entre parenteses no campo descricao. Exemplo: "UBER (ANA SILVA)"

REGRAS EXTRATO BANCARIO: Extrair TODAS as transacoes visiveis. Tipos: PIX enviado, PIX recebido, TED, DOC, tarifas, juros, rendimentos, saques, depositos. Debitos/saidas = valor positivo. Creditos/entradas = valor negativo. data_lancamento = MM/AAAA da propria data da transacao.

REGRAS COMPROVANTE / RECIBO: Gerar array transacoes com 1 item apenas. descricao = nome do destinatario ou estabelecimento. Para PIX: incluir chave PIX ou CPF/CNPJ do destinatario na descricao se visivel. data_lancamento = MM/AAAA da data do comprovante. tipo_operacao = pix | ted | doc | boleto | debito | dinheiro

REGRAS NOTA FISCAL / CUPOM: Se tiver itens detalhados: extrair cada item como transacao separada. Se nao tiver itens: 1 transacao com valor total. emissor = nome do estabelecimento. data_lancamento = MM/AAAA da data de emissao.

REGRA DE VALORES: Converter SEMPRE para number (nunca string). "R$ 1.250,90" = 1250.90. Remover R$, remover pontos de milhar, trocar virgula por ponto. Despesas/debitos = positivo. Receitas/creditos em extrato = negativo.

REGRA DE IMAGEM (JPEG/PNG/WEBP/HEIC): Processar mesmo que inclinada, com iluminacao imperfeita ou parcialmente cortada. Melhor esforco para extrair todos os dados visiveis. Dados ilegiveis ou cortados = null. NUNCA inventar. Preencher campo "alerta" se qualidade da imagem limitou a extracao de dados.

CATEGORIAS DISPONIVEIS: Alimentacao | Transporte | Moradia | Saude | Educacao | Lazer | Assinaturas | Vestuario | Investimentos | Receita | Outros

Retorne SOMENTE JSON valido, sem texto antes ou depois:
{"tipo_documento":"fatura_cartao|extrato_bancario|comprovante|nota_fiscal","emissor":"banco ou estabelecimento","titular":"nome principal ou null","valor_total":0.00,"vencimento":"DD/MM/AAAA ou null","periodo":"MM/AAAA ou null","data_lancamento":"MM/AAAA","transacoes":[{"data":"DD/MM/AAAA","data_lancamento":"MM/AAAA","descricao":"descricao completa","valor":0.00,"categoria":"Alimentacao|Transporte|Moradia|Saude|Educacao|Lazer|Assinaturas|Vestuario|Investimentos|Receita|Outros","parcela":"X/Y ou null","tipo_operacao":"compra|pix|ted|doc|boleto|saque|tarifa|credito|outros"}],"resumo_categorias":[{"categoria":"nome","total":0.00,"percentual":0}],"insights":["insight1","insight2","insight3"],"alerta":"texto descritivo ou null","versiculo":"texto ou null","versiculo_ref":"referencia ou null"}`;

      const geminiRes = await fetch(GEMINI_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { file_data: { mime_type: mimeNormalizado, file_uri: fileUri } },
                { text: promptTexto },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 65536,
          },
        }),
      });

      const responseText = await geminiRes.text();
      console.log("Gemini status:", geminiRes.status);

      if (!geminiRes.ok) {
        return new Response(
          JSON.stringify({
            error: "Gemini error " + geminiRes.status,
            details: responseText.substring(0, 300),
          }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const parsed = JSON.parse(responseText);
      const finishReason = parsed.candidates?.[0]?.finishReason;
      console.log("finishReason:", finishReason);

      if (finishReason === "MAX_TOKENS") {
        console.log("MAX_TOKENS atingido — tentando extrair resultado parcial");
        const partialPart = parsed.candidates?.[0]?.content?.parts?.[0];
        const partialText = partialPart?.text || "";
        // Tenta recuperar JSON parcial
        const clean1 = partialText.split("```json").join("");
        const clean2 = clean1.split("```").join("");
        const clean3 = clean2.trim();
        const startBrace = clean3.indexOf("{");
        if (startBrace !== -1) {
          // Fecha arrays e objetos abertos para formar JSON válido
          let jsonAttempt = clean3.substring(startBrace);
          // Conta chaves e colchetes abertos
          let openBraces = 0;
          let openBrackets = 0;
          for (let i = 0; i < jsonAttempt.length; i++) {
            const ch = jsonAttempt[i];
            if (ch === "{") openBraces++;
            else if (ch === "}") openBraces--;
            else if (ch === "[") openBrackets++;
            else if (ch === "]") openBrackets--;
          }
          // Fecha colchetes e chaves pendentes
          for (let i = 0; i < openBrackets; i++) jsonAttempt += "]";
          for (let i = 0; i < openBraces; i++) jsonAttempt += "}";
          // Remove possível vírgula antes de ] ou }
          jsonAttempt = jsonAttempt.split(",]").join("]");
          jsonAttempt = jsonAttempt.split(",}").join("}");
          try {
            const parcial = JSON.parse(jsonAttempt);
            parcial.parcial = true;
            parcial.alerta = "Documento muito extenso — resultado parcial. Algumas transacoes podem nao ter sido extraidas.";
            console.log("Resultado parcial recuperado. Transacoes:", parcial.transacoes?.length || 0);
            return new Response(JSON.stringify({ resultado: parcial }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          } catch (_parseErr) {
            console.error("Falha ao recuperar JSON parcial");
          }
        }
        // Se não conseguiu recuperar, retorna erro amigável
        return new Response(
          JSON.stringify({ error: "Documento muito extenso. Tente um arquivo menor ou com menos paginas." }),
          { status: 422, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const part = parsed.candidates?.[0]?.content?.parts?.[0];
      if (!part) {
        return new Response(
          JSON.stringify({
            error: "Sem conteudo retornado pelo Gemini",
            raw: responseText.substring(0, 200),
          }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      let resultado;
      const texto = part.text || "";
      const s1 = texto.split("```json").join("");
      const s2 = s1.split("```").join("");
      const s3 = s2.trim();

      try {
        resultado = s3 ? JSON.parse(s3) : part;
      } catch (_e1) {
        const inicio = s3.indexOf("{");
        const fim = s3.lastIndexOf("}");
        if (inicio !== -1 && fim > inicio) {
          try {
            resultado = JSON.parse(s3.substring(inicio, fim + 1));
          } catch (_e2) {
            return new Response(
              JSON.stringify({ error: "JSON invalido", raw: s3.substring(0, 300) }),
              { status: 422, headers: { ...cors, "Content-Type": "application/json" } }
            );
          }
        } else {
          resultado = part;
        }
      }

      console.log("data_lancamento extraido:", resultado?.data_lancamento);
      console.log("total transacoes:", resultado?.transacoes?.length || 0);
      console.log("Tipo:", resultado?.tipo_documento);
      return new Response(JSON.stringify({ resultado }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BRANCH 2: Prompt livre (Sabedoria)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else if (body.prompt) {
      console.log("Branch: prompt_livre");
      const geminiRes = await fetch(GEMINI_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: body.prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
      });
      if (!geminiRes.ok) {
        const err = await geminiRes.text();
        return new Response(
          JSON.stringify({
            error: "Gemini error " + geminiRes.status,
            details: err.substring(0, 200),
          }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      const parsed = JSON.parse(await geminiRes.text());
      const texto = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return new Response(JSON.stringify({ resultado: texto }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BRANCH 3: Análise financeira mensal
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else if (body.tipo === "analise_financeira") {
      console.log("Branch: analise_financeira");
      const dados = body.dados ? JSON.stringify(body.dados) : "sem dados";
      const geminiRes = await fetch(GEMINI_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
      });
      if (!geminiRes.ok) {
        const err = await geminiRes.text();
        return new Response(
          JSON.stringify({
            error: "Gemini error " + geminiRes.status,
            details: err.substring(0, 200),
          }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      const parsed = JSON.parse(await geminiRes.text());
      const texto = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return new Response(JSON.stringify({ resultado: texto }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BRANCH 4: Reflexão diária
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else if (body.tipo === "reflexao_diaria") {
      console.log("Branch: reflexao_diaria");
      const geminiRes = await fetch(GEMINI_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Gere uma reflexao diaria sobre financas e fe crista. Inclua versiculo biblico, aplicacao pratica e dica financeira. Responda em markdown com emojis.",
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
      });
      if (!geminiRes.ok) {
        const err = await geminiRes.text();
        return new Response(
          JSON.stringify({
            error: "Gemini error " + geminiRes.status,
            details: err.substring(0, 200),
          }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      const parsed = JSON.parse(await geminiRes.text());
      const texto = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return new Response(JSON.stringify({ resultado: texto }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BRANCH 6: Behavioral Insights
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else if (body.tipo === "behavioral_insights") {
      console.log("Branch: behavioral_insights");
      const contexto = body.contexto || {};
      const systemPrompt = "Voce e um especialista em financas comportamentais e patrimonio familiar. " +
        "Analise o perfil financeiro do usuario e gere 3-5 insights acionaveis.\n\n" +
        "DADOS DO USUARIO:\n" +
        "Perfil de risco: " + (contexto.risk_profile || "moderate") + "\n" +
        "Padrao de gastos: " + (contexto.spending_pattern || "desconhecido") + "\n" +
        "Padrao de poupanca: " + (contexto.saving_pattern || "desconhecido") + "\n" +
        "Score de disciplina: " + (contexto.discipline_score || 0) + "/100\n" +
        "Taxa de crescimento: " + (contexto.wealth_growth_rate || 0) + "\n" +
        "Patrimonio liquido: R$ " + (contexto.net_worth || 0) + "\n" +
        "Score financeiro: " + (contexto.financial_score || 0) + "/1000\n\n" +
        "Gere insights em JSON com este formato:\n" +
        '[{"type":"spending_pattern|wealth_growth|risk_warning|discipline|biblical_guidance",' +
        '"severity":"info|warning|critical|positive",' +
        '"insight":"Texto do insight (max 200 caracteres)"}]\n\n' +
        "Seja especifico, acionavel e motivador. Maximo 5 insights. Minimo 3. " +
        "Retorne SOMENTE o array JSON, sem texto antes ou depois.";

      const geminiRes = await fetch(GEMINI_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      });

      if (!geminiRes.ok) {
        const err = await geminiRes.text();
        return new Response(
          JSON.stringify({ error: "Gemini error " + geminiRes.status, details: err.substring(0, 200) }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const parsed = JSON.parse(await geminiRes.text());
      const texto = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";

      let insights;
      const s1 = texto.split("```json").join("");
      const s2 = s1.split("```").join("");
      const s3 = s2.trim();

      try {
        insights = JSON.parse(s3);
      } catch (_e1) {
        const inicio = s3.indexOf("[");
        const fim = s3.lastIndexOf("]");
        if (inicio !== -1 && fim > inicio) {
          try {
            insights = JSON.parse(s3.substring(inicio, fim + 1));
          } catch (_e2) {
            return new Response(
              JSON.stringify({ error: "JSON invalido nos insights", raw: s3.substring(0, 300) }),
              { status: 422, headers: { ...cors, "Content-Type": "application/json" } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: "Formato invalido", raw: s3.substring(0, 300) }),
            { status: 422, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }
      }

      console.log("Insights gerados:", Array.isArray(insights) ? insights.length : 0);
      return new Response(JSON.stringify({ resultado: insights }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    else {
      return new Response(
        JSON.stringify({
          error: "Parametros invalidos. Envie signedUrl+mimeType, prompt, ou tipo.",
        }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("Erro geral:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
