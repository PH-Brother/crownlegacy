import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, Image, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedMime } from "@/lib/sanitize";

const MAX_SIZE = 10 * 1024 * 1024;

interface Documento {
  id: string;
  nome_original: string;
  tipo: string;
  status: string;
  created_at: string | null;
}

interface DocumentUploadProps {
  userId: string;
  familiaId: string;
}

export default function DocumentUpload({ userId, familiaId }: DocumentUploadProps) {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchDocs = useCallback(async () => {
    const { data } = await supabase
      .from("documentos")
      .select("id, nome_original, tipo, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setDocs(data);
  }, [userId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (file: File) => {
    if (!isAllowedMime(file.type) && file.type !== "application/pdf") {
      toast({ title: "Formato não suportado", variant: "destructive" }); return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "Arquivo muito grande. Máximo 10MB.", variant: "destructive" }); return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${familiaId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(path, file, { upsert: false });
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
      fetchDocs();
    } catch {
      toast({ title: "Erro no upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleAnalyze = async (docId: string) => {
    toast({ title: "🔍 Análise IA em breve..." });
    // Placeholder — connects to gemini-proxy in production
  };

  return (
    <Card className="card-premium">
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground">📎 Enviar para Análise IA</p>
          <p className="text-[10px] text-muted-foreground">Faturas, comprovantes e extratos</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-primary/30 hover:border-primary/50"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-primary/60 mb-2" />
              <p className="text-xs text-muted-foreground">Arraste PDFs ou imagens aqui</p>
              <p className="text-[10px] text-primary mt-1">ou selecionar arquivo</p>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={onFileChange} />

        {/* Recent docs */}
        {docs.length > 0 && (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                {d.tipo.includes("pdf") ? (
                  <FileText className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <Image className="h-4 w-4 text-blue-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{d.nome_original}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : ""}
                    {" · "}
                    <span className={d.status === "analisado" ? "text-success" : "text-primary"}>
                      {d.status === "analisado" ? "Analisado" : "Aguardando"}
                    </span>
                  </p>
                </div>
                {d.status !== "analisado" && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-primary text-[10px]"
                    onClick={() => handleAnalyze(d.id)}>
                    <Sparkles className="h-3 w-3 mr-1" /> IA
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
