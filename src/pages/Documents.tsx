import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, Loader2, Trash2, Eye, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";

const MAX_SIZE = 5 * 1024 * 1024;
const RATE_LIMIT_KEY = "cl_upload_timestamps";
const MAX_UPLOADS_PER_HOUR = 5;

interface UploadedFile {
  id: string;
  file_name: string;
  file_size: number | null;
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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
      .select("id, file_name, file_size, status, transactions_count, error_message, created_at")
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
    if (file.type !== "application/pdf") {
      toast({ title: "Arquivo inválido", description: "Apenas PDF é suportado", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    if (!checkRateLimit()) {
      toast({ title: "Limite atingido", description: "Máximo 5 uploads por hora", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress("Enviando arquivo...");

    try {
      const storagePath = `${user.id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}-${Date.now()}.pdf`;

      // Upload to storage
      const { error: storageErr } = await supabase.storage
        .from("financial-documents")
        .upload(storagePath, file, { upsert: false });
      if (storageErr) throw storageErr;

      recordUpload();
      setUploadProgress("Registrando arquivo...");

      // Insert file record
      const { data: fileRecord, error: dbErr } = await supabase
        .from("uploaded_files")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          file_url: storagePath,
          status: "processing",
        })
        .select("id")
        .single();
      if (dbErr || !fileRecord) throw dbErr || new Error("Failed to create file record");

      setUploadProgress("Analisando com IA... aguarde");

      // Call edge function
      const { data: result, error: fnErr } = await supabase.functions.invoke("pdf-parser", {
        body: { fileId: fileRecord.id, storagePath, fileName: file.name },
      });

      if (fnErr) throw fnErr;

      const count = result?.transactionsCount || 0;
      toast({ title: `✅ ${count} transações extraídas com sucesso!` });
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

  const handleDelete = async () => {
    if (!deleteId) return;
    // Delete transactions first
    await supabase.from("transactions").delete().eq("file_id", deleteId);
    await supabase.from("uploaded_files").delete().eq("id", deleteId);
    toast({ title: "Arquivo deletado" });
    setDeleteId(null);
    fetchFiles();
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
            <div
              role="button"
              aria-label="Arraste um PDF ou clique para selecionar"
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
                  <Upload className="h-10 w-10 text-primary/60" />
                  <p className="text-sm text-foreground font-medium">Arraste um PDF aqui ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">PDF, máx 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={onFileChange}
              aria-label="Selecionar arquivo PDF"
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
                <p className="text-xs text-muted-foreground">Comece agora fazendo upload de um PDF!</p>
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
                          <td className="py-3 text-right text-foreground">{f.transactions_count || 0}</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {f.status === "completed" && (f.transactions_count || 0) > 0 && (
                                <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-primary">
                                  <Link to={`/extracted-transactions?file_id=${f.id}`}>
                                    <Eye className="h-3 w-3 mr-1" /> Ver
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
                            <span className="text-[10px] text-primary">{f.transactions_count} transações</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {f.status === "completed" && (f.transactions_count || 0) > 0 && (
                          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-[10px] text-primary">
                            <Link to={`/extracted-transactions?file_id=${f.id}`}>
                              <Eye className="h-3 w-3" />
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

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar documento</AlertDialogTitle>
            <AlertDialogDescription>
              Deletar este arquivo e todas as suas transações extraídas? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
