import { supabase } from "@/integrations/supabase/client";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      if (!base64Data) reject(new Error("Falha na conversão base64"));
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function analisarDocumentoGemini(
  storagePath: string,
  mimeType: string,
  fileName?: string
): Promise<string> {
  // 1. Signed URL
  const { data: urlData, error: urlError } = await supabase.storage
    .from("documentos")
    .createSignedUrl(storagePath, 180);

  if (urlError || !urlData?.signedUrl)
    throw new Error("Arquivo não encontrado no storage");

  // 2. Download
  const response = await fetch(urlData.signedUrl);
  if (!response.ok) throw new Error(`Erro ao baixar arquivo: ${response.status}`);

  const blob = await response.blob();

  // 3. Guarantee correct mimeType
  const mimeCorreto = blob.type || mimeType || "application/pdf";

  console.log("Enviando para Gemini:", {
    fileName: fileName || storagePath.split("/").pop(),
    mimeType: mimeCorreto,
    blobSize: blob.size,
  });

  // 4. Convert to clean base64
  const base64Data = await blobToBase64(blob);

  // 5. Call Edge Function
  const { data, error } = await supabase.functions.invoke("gemini-proxy", {
    body: {
      base64Data,
      mimeType: mimeCorreto,
      filename: fileName || storagePath.split("/").pop() || "documento",
    },
  });

  if (error) throw new Error(error.message || "Erro na Edge Function");
  if (data?.error) throw new Error(data.error);

  const resultado = data?.resultado || data?.text;
  if (!resultado) throw new Error("Gemini não retornou resultado");

  return resultado;
}
