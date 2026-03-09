import { supabase } from "@/integrations/supabase/client";

const MIME_MAP: Record<string, string> = {
  "pdf":  "application/pdf",
  "jpg":  "image/jpeg",
  "jpeg": "image/jpeg",
  "png":  "image/png",
  "webp": "image/webp",
  "heic": "image/heic",
  "heif": "image/heif",
};

const MIME_VALIDOS: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const resolverMimeType = (
  fileName: string,
  mimeTypeOriginal: string
): string => {
  const mimeOrigLower = (mimeTypeOriginal || "").toLowerCase().trim();

  // Normalizar variantes antes de validar
  const mimeNorm = mimeOrigLower === "image/jpg"
    ? "image/jpeg"
    : mimeOrigLower;

  // MIME original válido
  if (MIME_VALIDOS.has(mimeNorm)) return mimeNorm;

  // Fallback pela extensão do arquivo
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mimePorExt = MIME_MAP[ext];
  if (mimePorExt) {
    console.log("MIME resolvido por extensao:", ext, "→", mimePorExt);
    return mimePorExt;
  }

  // Default seguro
  console.warn("MIME desconhecido, usando PDF:", mimeTypeOriginal, fileName);
  return "application/pdf";
};

// Converte "MM/AAAA" → "AAAA-MM-01" para insert no banco
export const mesParaDate = (mesAno: string | null): string | null => {
  if (!mesAno) return null;
  const partes = mesAno.split("/");
  if (partes.length !== 2) return null;
  const mes = partes[0].padStart(2, "0");
  const ano = partes[1];
  if (mes.length !== 2 || ano.length !== 4) return null;
  return `${ano}-${mes}-01`;
};

export const analisarDocumentoGemini = async (
  storagePath: string,
  mimeType: string,
  fileName: string
) => {
  const mimeResolvido = resolverMimeType(fileName, mimeType);
  console.log("MIME resolvido:", mimeResolvido, "| Arquivo:", fileName);

  const { data: urlData, error: urlError } = await supabase
    .storage
    .from("documentos")
    .createSignedUrl(storagePath, 600);

  if (urlError || !urlData?.signedUrl) {
    throw new Error("Arquivo nao encontrado no storage");
  }

  const { data, error } = await supabase.functions.invoke(
    "gemini-proxy",
    {
      body: {
        signedUrl: urlData.signedUrl,
        mimeType: mimeResolvido,
        fileName: fileName,
      },
    }
  );

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.resultado) throw new Error("Sem resultado da IA");

  return data.resultado;
};
