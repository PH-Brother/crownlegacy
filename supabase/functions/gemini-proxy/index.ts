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
Analise o documento (pode ser PDF ou imagem fotografada) e extraia APENAS dados VISIVEIS.
NUNCA invente, estime ou complete dados. Se nao estiver legivel use null.

IDENTIFICACAO DO TIPO DE DOCUMENTO:
- fatura_cartao: fatura de cartao de credito (Itau, Bradesco, Nubank, Santander, C6, Inter, XP, BTG, Caixa, BB, Sicredi, Sicoob, outros)
- extrato_bancario: extrato de conta corrente ou poupanca
- comprovante: comprovante de pagamento PIX, TED, DOC, boleto, transferencia, recibo de loja, cupom fiscal
- nota_fiscal: nota fiscal eletronica (NF-e) ou cupom fiscal de estabelecimento

REGRAS POR TIPO DE DOCUMENTO:

[FATURA DE CARTAO]
- Extrair APENAS transacoes da secao Lancamentos atuais ou Lancamentos compras e saques
- IGNORAR secao Compras parceladas proximas faturas (informativa, causaria duplicidade)
- Datas DD/MM sem ano: usar ano do periodo da fatura. Se mes da transacao maior que mes da fatura, ano e o anterior
- Parcelamento Itau/Bradesco: padrao NOMEDD/MM colado (ex: LOJA 03/06 = parcela 3 de 6). Usar vencimento como data_transacao
- Parcelamento Nubank/outros: verificar descricao "Parcela X de Y" e usar mes da fatura como data
- Cartoes adicionais: incluir nome do titular entre parenteses na descricao
- valor_total = Total dos lancamentos atuais da fatura

[EXTRATO BANCARIO]
- Extrair TODAS as transacoes visiveis com data, descricao e valor
- Debitos = valor negativo, Creditos = valor positivo
- Incluir: PIX recebido, PIX enviado, TED, DOC, tarifas, juros, rendimentos
- valor_total = saldo final do periodo se visivel

[COMPROVANTE DE PAGAMENTO / RECIBO]
- Extrair o valor principal da transacao
- data = data do comprovante ou transacao
- descricao = nome do destinatario ou estabelecimento
- Tipo de operacao: PIX, TED, DOC, boleto, debito, credito, dinheiro
- Para PIX: incluir chave PIX ou CPF/CNPJ do destinatario na descricao se visivel
- valor_total = valor da transacao
- transacoes = array com 1 item (o comprovante em si)

[NOTA FISCAL / CUPOM FISCAL]
- Extrair cada item comprado como transacao separada se visivel
- Se nao tiver itens detalhados, criar 1 transacao com o total
- data = data de emissao
- emissor = nome do estabelecimento
- valor_total = valor total da nota

REGRA DE VALORES:
- Converter sempre para number. Ex: "R$ 1.250,90" = 1250.90
- Remover R$, pontos de milhar, trocar virgula por ponto
- Valores de debito/despesa = positivos (o sistema trata como despesa)
- Valores de credito/receita = negativos apenas se for extrato

REGRA DE IMAGEM (quando o documento e uma foto):
- Processar mesmo que a imagem esteja inclinada ou com iluminacao imperfeita
- Extrair todos os dados visiveis com melhor esforco
- Se algum dado nao estiver legivel, usar null — NUNCA inventar
- Alertar no campo alerta se a qualidade da imagem prejudicou a leitura

CATEGORIAS DISPONIVEIS (escolher a mais adequada):
Alimentacao | Transporte | Moradia | Saude | Educacao | Lazer | Assinaturas | Vestuario | Investimentos | Receita | Outros

Retorne SOMENTE JSON valido no formato:
{"tipo_documento":"fatura_cartao|extrato_bancario|comprovante|nota_fiscal","emissor":"nome do banco ou estabelecimento","titular":"nome principal ou null","valor_total":0.00,"vencimento":"DD/MM/AAAA ou null","periodo":"MM/AAAA ou null","transacoes":[{"data":"DD/MM/AAAA","descricao":"descricao completa","valor":0.00,"categoria":"Alimentacao|Transporte|Moradia|Saude|Educacao|Lazer|Assinaturas|Vestuario|Investimentos|Receita|Outros","parcela":"X/Y ou null","tipo_operacao":"compra|pix|ted|doc|boleto|saque|tarifa|credito|outros"}],"resumo_categorias":[{"categoria":"nome","total":0.00,"percentual":0}],"insights":["i1","i2","i3"],"alerta":"aviso sobre qualidade da imagem ou dados incompletos ou null","versiculo":"texto ou null","versiculo_ref":"ref ou null"}`;

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
            maxOutputTokens: 32768,
            responseMimeType: "application/json",
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
        return new Response(
          JSON.stringify({ error: "Documento muito extenso. Tente um arquivo menor." }),
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

      console.log(
        "Tipo:",
        resultado?.tipo_documento,
        "| Transacoes:",
        resultado?.transacoes?.length || 0
      );
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
    } else {
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
