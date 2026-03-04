import { supabase } from "@/integrations/supabase/client";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const PROMPT_ANALISE = `Você é um consultor financeiro cristão especialista.
Analise este documento financeiro com sabedoria e precisão.
Responda SEMPRE em português brasileiro.

## 📋 Tipo de Documento
Identifique: fatura, extrato, comprovante, nota fiscal, boleto, etc.

## 💰 Valores Identificados
Liste todos os valores monetários encontrados.
Destaque o valor total ou valor a pagar.

## 📅 Datas Relevantes
Vencimento, emissão, competência, período de referência.

## 🔍 Principais Transações ou Itens
Liste as principais movimentações, compras ou serviços.

## 💡 3 Insights Financeiros
Observações práticas e objetivas sobre os dados.

## ⚠️ Alertas Importantes
Gastos elevados, dívidas, vencimentos próximos, padrões preocupantes.

## 🙏 Sabedoria para Reflexão
Um versículo bíblico relevante ao contexto financeiro encontrado.
Explique brevemente como se aplica à situação.

Seja objetivo, use emojis nos títulos e formate bem com markdown.`;

export async function analisarDocumentoGemini(
  storagePath: string,
  mimeType: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada");

  // 1. Signed URL
  const { data: urlData, error: urlError } = await supabase.storage
    .from("documentos")
    .createSignedUrl(storagePath, 120);

  if (urlError || !urlData?.signedUrl)
    throw new Error("Arquivo não encontrado no storage");

  // 2. Download + base64
  const response = await fetch(urlData.signedUrl);
  if (!response.ok) throw new Error("Erro ao baixar arquivo");

  const blob = await response.blob();
  const base64Full = await blobToBase64(blob);
  const base64Data = base64Full.split(",")[1];

  // 3. Call Gemini
  const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
            { text: PROMPT_ANALISE },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1500,
      },
    }),
  });

  if (!geminiResponse.ok) {
    const err = await geminiResponse.json();
    throw new Error(err.error?.message || "Erro na API Gemini");
  }

  const geminiData = await geminiResponse.json();
  const resultado =
    geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!resultado) throw new Error("Gemini não retornou resultado");

  return resultado;
}
