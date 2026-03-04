import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, Image, Loader2, Sparkles, Eye, RotateCcw, X, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedMime } from "@/lib/sanitize";

const MAX_SIZE = 10 * 1024 * 1024;

interface Documento {
  id: string;
  nome_original: string;
  storage_path: string;
  tipo: string;
  status: string;
  analise_resultado: string | null;
  created_at: string | null;
}

interface DocumentUploadProps {
  userId: string;
  familiaId: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function DocumentUpload({ userId, familiaId }: DocumentUploadProps) {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetResult, setSheetResult] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchDocs = useCallback(async () => {
    const { data } = await supabase
      .from("documentos")
      .select("id, nome_original, storage_path, tipo, status, analise_resultado, created_at")
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

  const handleAnalyze = async (doc: Documento) => {
    setAnalyzingId(doc.id);

    // Optimistic status update
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: "analisando" } : d));

    try {
      // 1. Get signed URL
      const { data: urlData, error: urlErr } = await supabase.storage
        .from("documentos")
        .createSignedUrl(doc.storage_path, 120);
      if (urlErr || !urlData?.signedUrl) throw new Error("Não foi possível acessar o arquivo");

      // 2. Download and convert to base64
      const response = await fetch(urlData.signedUrl);
      if (!response.ok) throw new Error("Falha ao baixar arquivo");
      const blob = await response.blob();
      const base64Full = await blobToBase64(blob);
      const base64Data = base64Full.split(",")[1];

      // 3. Call edge function with file data
      const { data, error } = await supabase.functions.invoke("gemini-proxy", {
        body: {
          tipo: "analise_documento",
          dados: {
            file_base64: base64Data,
            mime_type: doc.tipo,
            filename: doc.nome_original,
          },
        },
      });

      if (error) throw error;

      const resultado = data?.resultado || "Análise concluída sem detalhes.";

      // 4. Save result
      await supabase
        .from("documentos")
        .update({ status: "analisado", analise_resultado: resultado })
        .eq("id", doc.id);

      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: "analisado", analise_resultado: resultado } : d));

      // 5. Show result
      setSheetResult(resultado);
      setSheetOpen(true);

      toast({ title: "✅ Análise concluída!" });
    } catch (err) {
      console.error("Analyze error:", err);
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: "erro" } : d));
      await supabase.from("documentos").update({ status: "erro" }).eq("id", doc.id);
      toast({ title: "Erro na análise", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setAnalyzingId(null);
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

  const copyResult = async () => {
    await navigator.clipboard.writeText(sheetResult);
    toast({ title: "📋 Análise copiada!" });
  };

  const statusBadge = (doc: Documento) => {
    switch (doc.status) {
      case "analisando":
        return <span className="text-[10px] text-primary flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Analisando...</span>;
      case "analisado":
        return <span className="text-[10px] text-emerald-400">✅ Analisado</span>;
      case "erro":
        return <span className="text-[10px] text-destructive">🔴 Erro</span>;
      default:
        return <span className="text-[10px] text-muted-foreground">🟡 Pendente</span>;
    }
  };

  const actionButton = (doc: Documento) => {
    const isAnalyzing = analyzingId === doc.id;

    if (doc.status === "analisado" && doc.analise_resultado) {
      return (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-primary text-[10px]"
          onClick={() => { setSheetResult(doc.analise_resultado!); setSheetOpen(true); }}>
          <Eye className="h-3 w-3 mr-1" /> Ver
        </Button>
      );
    }

    if (doc.status === "erro") {
      return (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-primary text-[10px]"
          onClick={() => handleAnalyze(doc)} disabled={isAnalyzing}>
          <RotateCcw className="h-3 w-3 mr-1" /> Retry
        </Button>
      );
    }

    if (doc.status === "analisando") {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }

    return (
      <Button size="sm" variant="ghost" className="h-7 px-2 text-primary text-[10px]"
        onClick={() => handleAnalyze(doc)} disabled={isAnalyzing}>
        <Sparkles className="h-3 w-3 mr-1" /> IA
      </Button>
    );
  };

  return (
    <>
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
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground">
                        {d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : ""}
                      </p>
                      {statusBadge(d)}
                    </div>
                  </div>
                  {actionButton(d)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto" style={{ background: "#0f0f1a", borderTop: "2px solid #d4af37" }}>
          <SheetHeader className="flex-row items-center justify-between pr-8">
            <SheetTitle className="text-base" style={{ color: "#d4af37" }}>📊 Análise Gemini IA</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div
              className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(sheetResult) }}
            />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={copyResult} className="text-xs border-primary/30 text-primary">
                <Copy className="h-3 w-3 mr-1" /> Copiar análise
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSheetOpen(false)} className="text-xs text-muted-foreground">
                <X className="h-3 w-3 mr-1" /> Fechar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Basic markdown to HTML */
function formatMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#d4af37">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h3 style="color:#d4af37;margin-top:1rem;font-size:0.9rem">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#d4af37;margin-top:1rem;font-size:1rem">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:#d4af37;margin-top:1rem;font-size:1.1rem">$1</h1>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:1rem">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:1rem">$1. $2</li>')
    .replace(/\n/g, "<br/>");
}
