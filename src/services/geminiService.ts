import { supabase } from "@/integrations/supabase/client";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function analisarDocumentoGemini(
  storagePath: string,
  mimeType: string
): Promise<string> {
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

  // 3. Call via Edge Function (secure — API key stays server-side)
  const { data, error } = await supabase.functions.invoke("gemini-proxy", {
    body: {
      tipo: "analise_documento",
      dados: {
        file_base64: base64Data,
        mime_type: mimeType,
        filename: storagePath.split("/").pop() || "documento",
      },
    },
  });

  if (error) throw new Error(error.message || "Erro na análise");

  const resultado = data?.resultado || data?.text;
  if (!resultado) throw new Error("Gemini não retornou resultado");

  return resultado;
}