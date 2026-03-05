import { supabase } from "@/integrations/supabase/client";

// MIME types suportados para upload
const MIME_SUPORTADOS: Record<string, string> = {
  "pdf": "application/pdf",
  "jpg": "image/jpeg",
  "jpeg": "image/jpeg",
  "png": "image/png",
  "webp": "image/webp",
  "heic": "image/heic",
  "heif": "image/heif",
};

const resolverMimeType = (
  fileName: string,
  mimeTypeOriginal: string
): string => {
  // Usar mimeType original se válido
  if (mimeTypeOriginal && mimeTypeOriginal !== "application/octet-stream") {
    return mimeTypeOriginal.toLowerCase().trim();
  }
  // Fallback: inferir pela extensão do arquivo
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return MIME_SUPORTADOS[ext] || "application/pdf";
};

export const analisarDocumentoGemini = async (
  storagePath: string,
  mimeType: string,
  fileName: string
): Promise<object> => {
  const mimeResolvido = resolverMimeType(fileName, mimeType);
  console.log("[geminiService] MIME resolvido:", mimeResolvido, "| Arquivo:", fileName);

  const { data: urlData, error: urlError } = await supabase
    .storage
    .from("documentos")
    .createSignedUrl(storagePath, 600);

  if (urlError || !urlData?.signedUrl) {
    throw new Error("Arquivo nao encontrado no storage: " + urlError?.message);
  }

  console.log("[geminiService] Enviando signed URL para Edge Function");

  const { data, error } = await supabase.functions.invoke("gemini-proxy", {
    body: {
      signedUrl: urlData.signedUrl,
      mimeType: mimeResolvido,
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
