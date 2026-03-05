import { supabase } from "@/integrations/supabase/client";

export const analisarDocumentoGemini = async (
  storagePath: string,
  mimeType: string,
  fileName: string
): Promise<object> => {

  // PASSO 1: URL assinada
  const { data: urlData, error: urlError } = await supabase
    .storage
    .from("documentos")
    .createSignedUrl(storagePath, 180);

  if (urlError || !urlData?.signedUrl) {
    throw new Error("Arquivo não encontrado no storage: " + urlError?.message);
  }

  // PASSO 2: Download do arquivo
  const fetchRes = await fetch(urlData.signedUrl);
  if (!fetchRes.ok) {
    throw new Error("Erro ao baixar arquivo: " + fetchRes.status);
  }
  const blob = await fetchRes.blob();

  // PASSO 3: Converter para base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const b64 = result.split(",")[1];
      if (!b64) reject(new Error("Falha na conversão base64"));
      else resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const mimeCorreto = blob.type || mimeType || "application/pdf";

  console.log("[geminiService] Enviando para Edge Function:", {
    fileName,
    mimeType: mimeCorreto,
    base64Length: base64Data.length,
  });

  // PASSO 4: Chamar Edge Function COM BODY OBRIGATÓRIO
  const { data, error } = await supabase.functions.invoke("gemini-proxy", {
    body: {
      base64Data: base64Data,
      mimeType: mimeCorreto,
      fileName: fileName,
    },
  });

  if (error) {
    console.error("[geminiService] Erro Edge Function:", error);
    throw new Error(error.message || "Erro na Edge Function");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.resultado) {
    throw new Error("Sem resultado retornado pela IA");
  }

  console.log(
    "[geminiService] Transações extraídas:",
    data.resultado.transacoes?.length ?? 0
  );

  return data.resultado;
};
