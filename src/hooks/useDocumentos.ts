import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedMime } from "@/lib/sanitize";
import { useToast } from "@/hooks/use-toast";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const MAX_SIZE = 10 * 1024 * 1024;

export interface Documento {
  id: string;
  nome_original: string;
  storage_path: string;
  tipo: string;
  status: string;
  analise_resultado: string | null;
  created_at: string | null;
}

export function useDocumentos(userId: string, familiaId: string) {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const { toast } = useToast();

  const listarDocumentos = useCallback(async () => {
    const { data } = await supabase
      .from("documentos")
      .select("id, nome_original, storage_path, tipo, status, analise_resultado, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setDocs(data);
  }, [userId]);

  useEffect(() => {
    listarDocumentos();
  }, [listarDocumentos]);

  const uploadDocumento = useCallback(
    async (file: File) => {
      if (!isAllowedMime(file.type) && file.type !== "application/pdf") {
        toast({ title: "Formato não suportado", variant: "destructive" });
        return;
      }
      if (file.size > MAX_SIZE) {
        toast({ title: "Arquivo muito grande. Máximo 10MB.", variant: "destructive" });
        return;
      }

      setUploading(true);
      try {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${userId}/${familiaId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documentos")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;

        const { error: dbErr } = await supabase.from("documentos").insert({
          user_id: userId,
          familia_id: familiaId,
          nome_original: file.name,
          storage_path: path,
          tipo: file.type,
          status: "pendente",
        });
        if (dbErr) throw dbErr;

        toast({ title: "📎 Documento enviado!" });
        listarDocumentos();
      } catch {
        toast({ title: "Erro no upload", variant: "destructive" });
      } finally {
        setUploading(false);
      }
    },
    [userId, familiaId, toast, listarDocumentos]
  );

  const analisarDocumento = useCallback(
    async (doc: Documento) => {
      console.log("🔍 Iniciando análise:", doc.id);
      console.log("📁 Storage path:", doc.storage_path);
      console.log("📄 Mime type:", doc.tipo);

      setAnalyzingId(doc.id);
      setDocs((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: "analisando" } : d))
      );

      try {
        // Update status in DB
        await supabase
          .from("documentos")
          .update({ status: "analisando" })
          .eq("id", doc.id);

        console.log("⚡ Chamando analisarDocumentoGemini...");
        const resultado = await analisarDocumentoGemini(doc.storage_path, doc.tipo);
        console.log("✅ Resultado recebido:", resultado?.substring(0, 100));

        await supabase
          .from("documentos")
          .update({ status: "analisado", analise_resultado: resultado })
          .eq("id", doc.id);

        setDocs((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? { ...d, status: "analisado", analise_resultado: resultado }
              : d
          )
        );

        toast({ title: "✅ Análise concluída!" });
        return resultado;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
        console.error("❌ Erro na análise:", errorMsg, err);

        await supabase
          .from("documentos")
          .update({ status: "pendente" })
          .eq("id", doc.id);

        setDocs((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, status: "pendente" } : d))
        );

        toast({
          title: "Erro na análise",
          description: errorMsg,
          variant: "destructive",
        });
        return null;
      } finally {
        setAnalyzingId(null);
      }
    },
    [toast]
  );

  return {
    docs,
    uploading,
    analyzingId,
    uploadDocumento,
    analisarDocumento,
    refetch: listarDocumentos,
  };
}
