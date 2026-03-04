import { useState, useRef } from "react";
import { Upload, FileText, Image, Loader2, Eye, X, Copy, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useDocumentos, type Documento } from "@/hooks/useDocumentos";

interface DocumentUploadProps {
  userId: string;
  familiaId: string;
}

/* ── Loading dots ── */
function GoldenLoadingDots() {
  return (
    <div className="flex items-center gap-3 py-4 justify-center">
      <div className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <div
            key={delay}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span
        className="text-primary text-sm italic"
        style={{ fontFamily: "Lora, serif" }}
      >
        Analisando documento...
      </span>
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "analisando":
      return (
        <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-500/20 text-blue-500 border-blue-500/30">
          <Loader2 className="h-3 w-3 animate-spin" /> Analisando...
        </Badge>
      );
    case "analisado":
      return (
        <Badge variant="secondary" className="text-[10px] bg-success/20 text-success border-success/30">
          ✅ Analisado
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary border-primary/30">
          ⏳ Pendente
        </Badge>
      );
  }
}

/* ── Doc icon ── */
function DocIcon({ tipo }: { tipo: string }) {
  if (tipo.includes("pdf")) {
    return <FileText className="h-5 w-5 text-destructive shrink-0" />;
  }
  return <Image className="h-5 w-5 text-blue-500 shrink-0" />;
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div className="text-center py-6 space-y-2">
      <Upload className="h-12 w-12 mx-auto text-primary/40" />
      <p className="text-sm text-foreground font-medium">Nenhum documento ainda</p>
      <p className="text-xs text-muted-foreground">Envie faturas, extratos ou comprovantes</p>
    </div>
  );
}

/* ── Main component ── */
export default function DocumentUpload({ userId, familiaId }: DocumentUploadProps) {
  const {
    docs,
    uploading,
    analyzingId,
    uploadDocumento,
    analisarDocumento,
  } = useDocumentos(userId, familiaId);

  const [dragging, setDragging] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetResult, setSheetResult] = useState("");
  const [sheetDocName, setSheetDocName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadDocumento(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadDocumento(file);
  };

  const openResult = (doc: Documento) => {
    if (doc.analise_resultado) {
      setSheetResult(doc.analise_resultado);
      setSheetDocName(doc.nome_original);
      setSheetOpen(true);
    }
  };

  const handleAnalyze = async (doc: Documento) => {
    const resultado = await analisarDocumento(doc);
    if (resultado) {
      setSheetResult(resultado);
      setSheetDocName(doc.nome_original);
      setSheetOpen(true);
    }
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(sheetResult);
    toast({ title: "Análise copiada! 📋" });
  };

  const truncate = (s: string, n: number) =>
    s.length > n ? s.slice(0, n) + "…" : s;

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
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={onFileChange}
          />

          {/* Document list */}
          {docs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {docs.map((d) => {
                const isAnalyzing = analyzingId === d.id;
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <DocIcon tipo={d.tipo} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">
                        {truncate(d.nome_original, 30)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-muted-foreground">
                          {d.created_at
                            ? new Date(d.created_at).toLocaleDateString("pt-BR")
                            : ""}
                        </p>
                        <StatusBadge status={d.status ?? "pendente"} />
                      </div>
                    </div>

                    {/* Actions */}
                    {d.status === "analisado" && d.analise_resultado ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px] border-primary/30 text-primary"
                        onClick={() => openResult(d)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Ver
                      </Button>
                    ) : d.status === "analisando" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 px-2 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => handleAnalyze(d)}
                        disabled={isAnalyzing}
                      >
                        <Zap className="h-3 w-3 mr-1" /> Analisar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Inline loading */}
          {analyzingId && <GoldenLoadingDots />}
        </CardContent>
      </Card>

      {/* Result Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto border-t-2 border-primary bg-card"
        >
          <SheetHeader className="pr-8">
            <SheetTitle
              className="text-base text-primary"
              style={{ fontFamily: "Lora, serif" }}
            >
              📊 Análise IA — {truncate(sheetDocName, 25)}
            </SheetTitle>
            <p className="text-[10px] text-primary/60">Powered by Google Gemini</p>
          </SheetHeader>

          <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-muted border border-primary/20 rounded-xl p-4 max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2
                        className="text-primary font-semibold text-lg mt-4 mb-2"
                        style={{ fontFamily: "Lora, serif" }}
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3
                        className="text-primary font-semibold text-sm mt-4 mb-1"
                        style={{ fontFamily: "Lora, serif" }}
                      >
                        {children}
                      </h3>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-primary font-bold">{children}</strong>
                    ),
                    p: ({ children }) => (
                      <p
                        className="text-foreground text-sm leading-relaxed mb-2"
                        style={{ fontFamily: "Lora, serif" }}
                      >
                        {children}
                      </p>
                    ),
                    li: ({ children }) => (
                      <li className="text-foreground text-sm leading-relaxed flex gap-2 mb-1">
                        <span className="text-primary flex-shrink-0">•</span>
                        <span>{children}</span>
                      </li>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-none pl-0 space-y-1 mb-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-none pl-0 space-y-1 mb-2">{children}</ol>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground my-3">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {sheetResult}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={copyResult}
                className="text-xs border-primary/30 text-primary"
              >
                <Copy className="h-3 w-3 mr-1" /> Copiar análise
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSheetOpen(false)}
                className="text-xs text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" /> Fechar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}