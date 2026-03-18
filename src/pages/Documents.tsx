import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, Image, Loader2, Trash2, Eye, AlertCircle, CheckCircle2, Clock, X, Download } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_SIZE = 10 * 1024 * 1024;
const RATE_LIMIT_KEY = "cl_upload_timestamps";
const MAX_UPLOADS_PER_HOUR = 5;

function mapCategory(cat: string): string {
  const map: Record<string, string> = {
    "Food": "Alimentação",
    "Transport": "Transporte",
    "Health": "Saúde",
    "Education": "Educação",
    "Entertainment": "Lazer",
    "Shopping": "Roupas",
    "Utilities": "Moradia",
    "Travel": "Lazer",
    "Services": "Outros",
    "Other": "Outros",
  };
  return map[cat] || cat || "Outros";
}

function pluralTransacao(n: number): string {
  return n === 1 ? "1 transação" : `${n} transações`;
}

function getDataHoje(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function isDataValida(date: string): boolean {
  if (!date || date.trim() === "") return false;
  const parsed = Date.parse(date);
  return !isNaN(parsed);
}

interface UploadedFile {
  id: string;
  file_name: string;
  file_size: number | null;
  file_url: string | null;
  status: string | null;
  transactions_count: number | null;
  error_message: string | null;
  created_at: string | null;
}

function checkRateLimit(): boolean {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const oneHourAgo = Date.now() - 3600000;
    const recent = timestamps.filter((t) => t > oneHourAgo);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
    return recent.length < MAX_UPLOADS_PER_HOUR;
  } catch {
    return true;
  }
}

function recordUpload() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps.push(Date.now());
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(timestamps));
  } catch { /* noop */ }
}

function isImageFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "webp", "heic"].includes(ext);
}

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [vencimentoFatura, setVencimentoFatura] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewingFile, setViewingFile] = useState<{ url: string; type: "pdf" | "image"; name: string } | null>(null);
  const PAGE_SIZE = 10;

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { count } = await supabase
      .from("uploaded_files")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    setTotal(count || 0);

    const { data } = await supabase
      .from("uploaded_files")
      .select("id, file_name, file_size, file_url, status, transactions_count, error_message, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    setFiles((data as UploadedFile[]) || []);
    setLoading(false);
  }, [user, page]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (file: File) => {
    if (!user) return;

    const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isAllowed = ALLOWED_TYPES.includes(file.type) || ext === "pdf" || ["jpg", "jpeg", "png", "webp", "heic"].includes(ext);

    if (!isAllowed) {
      toast({ title: "Arquivo inválido", description: "Formatos aceitos: JPG, PNG, WEBP, HEIC, PDF", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }
    if (!checkRateLimit()) {
      toast({ title: "Limite atingido", description: "Máximo 5 uploads por hora", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress("Enviando arquivo...");

    try {
      const safeExt = ext || "bin";
      const storagePath = `${user.id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}-${Date.now()}.${safeExt}`;
      const isPdf = file.type === "application/pdf" || ext === "pdf";

      // Upload to storage
      const { error: storageErr } = await supabase.storage
        .from("financial-documents")
        .upload(storagePath, file, { upsert: false });
      if (storageErr) throw storageErr;

      recordUpload();
      setUploadProgress("Registrando arquivo...");

      // Insert file record
      const fileName = (() => {
        if (vencimentoFatura) {
          try {
            const [ano, mes] = vencimentoFatura.split("-");
            const d = new Date(Number(ano), Number(mes) - 1, 1);
            const mesNome = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            return `Fatura ${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} — ${file.name}`;
          } catch { /* fallback */ }
        }
        return file.name;
      })();

      const { data: fileRecord, error: dbErr } = await supabase
        .from("uploaded_files")
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_size: file.size,
          file_url: storagePath,
          status: "processing",
        })
        .select("id")
        .single();
      if (dbErr || !fileRecord) throw dbErr || new Error("Failed to create file record");

      setUploadProgress("Analisando com IA... aguarde");

      let count = 0;
      let resultTransactions: any[] = [];

      if (isPdf) {
        // PDF → use pdf-parser edge function
        const { data: result, error: fnErr } = await supabase.functions.invoke("pdf-parser", {
          body: { fileId: fileRecord.id, storagePath, fileName: file.name },
        });
        if (fnErr) throw fnErr;
        count = result?.transactionsCount || 0;
        resultTransactions = result?.transactions || [];
      } else {
        // Image → use gemini-proxy edge function with signed URL
        const { data: urlData } = await supabase.storage
          .from("financial-documents")
          .createSignedUrl(storagePath, 600);
        if (!urlData?.signedUrl) throw new Error("Arquivo não encontrado");

        const MIME_MAP: Record<string, string> = {
          jpg: "image/jpeg", jpeg: "image/jpeg",
          png: "image/png", webp: "image/webp", heic: "image/heic",
        };
        const mimeResolvido = file.type && file.type !== "application/octet-stream"
          ? file.type.toLowerCase().trim()
          : MIME_MAP[ext] || "image/jpeg";

        const { data: result, error: fnErr } = await supabase.functions.invoke("gemini-proxy", {
          body: {
            signedUrl: urlData.signedUrl,
            mimeType: mimeResolvido,
            fileName: file.name,
          },
        });
        if (fnErr) throw fnErr;
        if (result?.error) throw new Error(result.error);

        const resultado = result?.resultado;
        if (resultado && typeof resultado === "object" && Array.isArray(resultado.transacoes)) {
          count = resultado.transacoes.length;
          resultTransactions = resultado.transacoes.map((t: any) => ({
            amount: t.valor,
            merchant: t.descricao,
            category: t.categoria,
            date: t.data,
            description: t.descricao,
          }));
        }

        // Update file record
        await supabase.from("uploaded_files").update({
          status: "completed",
          transactions_count: count,
        }).eq("id", fileRecord.id);
      }

      toast({ title: `✅ ${pluralTransacao(count)} extraída${count !== 1 ? "s" : ""} com sucesso!` });

      // Sync to transacoes table
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && resultTransactions.length > 0) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("familia_id")
            .eq("id", session.user.id)
            .maybeSingle();

          if (prof?.familia_id) {
            const rows = resultTransactions.map((t: any) => ({
                usuario_id: session.user.id,
                familia_id: prof.familia_id,
                tipo: "despesa",
                valor: Math.abs(Number(t.amount || t.valor || 0)),
                categoria: mapCategory(t.category || t.categoria || "Other"),
                descricao: t.merchant || t.description || t.descricao || "Documento importado",
                data_transacao: (() => {
                  if (vencimentoFatura && vencimentoFatura.trim() !== "") return `${vencimentoFatura}-01`;
                  const aiDate = t.date || t.data;
                  if (aiDate && isDataValida(aiDate)) return aiDate;
                  return getDataHoje();
                })(),
                recorrente: false,
                tags: ["documento-importado"],
              }));
            await supabase.from("transacoes").insert(rows);
          }
        }
      } catch (err) {
        console.error("Erro ao lançar em transacoes:", err);
      }

      setVencimentoFatura("");
      setPage(1);
      await fetchFiles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro no upload", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleUpload(f);
  };

  const handleViewFile = async (file: UploadedFile) => {
    if (!file.file_url) {
      toast({ title: "Arquivo não disponível", variant: "destructive" });
      return;
    }
    try {
      const { data } = await supabase.storage
        .from("financial-documents")
        .createSignedUrl(file.file_url, 3600);
      if (!data?.signedUrl) throw new Error("URL não encontrada");

      const type = isImageFile(file.file_name) ? "image" : "pdf";
      setViewingFile({ url: data.signedUrl, type, name: file.file_name });
    } catch {
      toast({ title: "Erro ao carregar arquivo", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    setDeleting(true);
    try {
      // Find the file to get its storage path
      const fileToDelete = files.find(f => f.id === deleteId);

      // Delete associated transacoes (by tag + user)
      await supabase.from("transacoes")
        .delete()
        .eq("usuario_id", user.id)
        .contains("tags", ["documento-importado"]);

      // Delete transactions from transactions table
      await supabase.from("transactions").delete().eq("file_id", deleteId);

      // Delete from storage if path exists
      if (fileToDelete?.file_url) {
        await supabase.storage.from("financial-documents").remove([fileToDelete.file_url]);
      }

      // Delete the file record
      await supabase.from("uploaded_files").delete().eq("id", deleteId);

      toast({ title: "Documento excluído com sucesso" });
      setDeleteId(null);
      fetchFiles();
    } catch {
      toast({ title: "Erro ao excluir documento", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const StatusIcon = ({ status }: { status: string | null }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "processing":
        return <Clock className="h-4 w-4 text-primary animate-pulse" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (s: string | null) => {
    switch (s) {
      case "completed": return "Concluído";
      case "processing": return "Processando";
      case "failed": return "Erro";
      default: return "Pendente";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>
          Meus Documentos
        </h1>

        {/* Upload Card */}
        <Card className="card-premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Upload de Comprovante Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Campo de vencimento para faturas */}
            <div className="mb-4 space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Mês de vencimento da fatura (opcional)
              </label>
              <input
                type="month"
                value={vencimentoFatura}
                onChange={(e) => setVencimentoFatura(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-border bg-input text-foreground outline-none focus:border-primary text-sm"
                placeholder="Ex: 2026-03"
              />
              <p className="text-[10px] text-muted-foreground">
                Para faturas de cartão: informe o mês do vencimento para lançar as despesas no mês correto
              </p>
            </div>
            <div
              role="button"
              aria-label="Arraste um arquivo ou clique para selecionar"
              aria-busy={uploading}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !uploading && inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-primary/30 hover:border-primary/50"
              } ${uploading ? "pointer-events-none opacity-60" : ""}`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-primary font-medium">{uploadProgress}</p>
                  <p className="text-xs text-muted-foreground">Pode levar alguns minutos</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Image className="h-6 w-6 text-primary" />
                    </div>
                    <div className="h-8 w-px rounded-full bg-border" />
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-foreground font-medium">Toque para enviar foto ou PDF</p>
                  <p className="text-xs text-muted-foreground">JPG · PNG · WEBP · HEIC · PDF — máx 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,application/pdf,.pdf"
              className="hidden"
              onChange={onFileChange}
              aria-label="Selecionar arquivo"
            />
          </CardContent>
        </Card>

        {/* File History */}
        <Card className="card-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Histórico de Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-foreground font-medium">Nenhum documento enviado ainda</p>
                <p className="text-xs text-muted-foreground">Comece agora fazendo upload de uma foto ou PDF!</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block">
                  <table className="w-full text-sm" aria-label="Tabela de arquivos">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 text-muted-foreground font-medium">Arquivo</th>
                        <th className="text-left py-2 text-muted-foreground font-medium">Data</th>
                        <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Transações</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((f) => (
                        <tr key={f.id} className="border-b border-border/30">
                          <td className="py-3 text-foreground max-w-[200px] truncate">{f.file_name}</td>
                          <td className="py-3 text-muted-foreground">
                            {f.created_at ? new Date(f.created_at).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="py-3">
                            <span className="flex items-center gap-1.5">
                              <StatusIcon status={f.status} />
                              <span className="text-foreground">{statusLabel(f.status)}</span>
                            </span>
                          </td>
                          <td className="py-3 text-right text-foreground">
                            {pluralTransacao(f.transactions_count || 0)}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {f.file_url && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => handleViewFile(f)}>
                                  <Eye className="h-3 w-3 mr-1" /> Ver
                                </Button>
                              )}
                              {f.status === "completed" && (f.transactions_count || 0) > 0 && (
                                <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-primary">
                                  <Link to={`/extracted-transactions?file_id=${f.id}`}>
                                    <FileText className="h-3 w-3 mr-1" /> Dados
                                  </Link>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive"
                                onClick={() => setDeleteId(f.id)}
                                aria-label={`Deletar ${f.file_name}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{f.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusIcon status={f.status} />
                          <span className="text-[10px] text-muted-foreground">{statusLabel(f.status)}</span>
                          {(f.transactions_count || 0) > 0 && (
                            <span className="text-[10px] text-primary">{pluralTransacao(f.transactions_count || 0)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {f.file_url && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-primary" onClick={() => handleViewFile(f)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        {f.status === "completed" && (f.transactions_count || 0) > 0 && (
                          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-[10px] text-primary">
                            <Link to={`/extracted-transactions?file_id=${f.id}`}>
                              <FileText className="h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive"
                          onClick={() => setDeleteId(f.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 text-sm">
                    <span className="text-muted-foreground">
                      Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        Anterior
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View File Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{viewingFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[75vh]">
            {viewingFile?.type === "image" ? (
              <img src={viewingFile.url} alt={viewingFile.name} className="w-full max-h-[70vh] object-contain rounded-lg" />
            ) : viewingFile?.type === "pdf" ? (
              <iframe src={viewingFile.url} className="w-full h-[70vh] rounded-lg border-0" title={viewingFile.name} />
            ) : null}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" asChild>
              <a href={viewingFile?.url} download={viewingFile?.name} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" /> Baixar
              </a>
            </Button>
            <Button variant="outline" onClick={() => setViewingFile(null)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O documento e todos os lançamentos associados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground" disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
