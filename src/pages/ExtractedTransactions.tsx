import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

const CATEGORIES = ["Shopping", "Food", "Transport", "Utilities", "Entertainment", "Health", "Education", "Travel", "Services", "Other"];
const PAGE_SIZE = 20;

interface Transaction {
  id: string;
  transaction_date: string;
  merchant: string;
  category: string | null;
  amount: number;
  description: string | null;
  file_id: string | null;
}

interface FileOption {
  id: string;
  file_name: string;
}

export default function ExtractedTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false);
  const [files, setFiles] = useState<FileOption[]>([]);

  // Filters
  const [dateStart, setDateStart] = useState(searchParams.get("date_start") || "");
  const [dateEnd, setDateEnd] = useState(searchParams.get("date_end") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [fileId, setFileId] = useState(searchParams.get("file_id") || "");

  // Fetch file options
  useEffect(() => {
    if (!user) return;
    supabase
      .from("uploaded_files")
      .select("id, file_name")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .then(({ data }) => setFiles((data as FileOption[]) || []));
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("transactions")
      .select("id, transaction_date, merchant, category, amount, description, file_id", { count: "exact" })
      .eq("user_id", user.id);

    if (dateStart) query = query.gte("transaction_date", dateStart);
    if (dateEnd) query = query.lte("transaction_date", dateEnd);
    if (category) query = query.eq("category", category);
    if (fileId) query = query.eq("file_id", fileId);

    query = query.order("transaction_date", { ascending: sortAsc });

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) {
      toast({ title: "Erro ao carregar transações", variant: "destructive" });
      setLoading(false);
      return;
    }

    setTransactions((data as Transaction[]) || []);
    setTotal(count || 0);

    // Calculate total amount (for filtered results)
    let sumQuery = supabase.from("transactions").select("amount").eq("user_id", user.id);
    if (dateStart) sumQuery = sumQuery.gte("transaction_date", dateStart);
    if (dateEnd) sumQuery = sumQuery.lte("transaction_date", dateEnd);
    if (category) sumQuery = sumQuery.eq("category", category);
    if (fileId) sumQuery = sumQuery.eq("file_id", fileId);
    const { data: sumData } = await sumQuery;
    const sum = (sumData || []).reduce((acc, r) => acc + Number(r.amount || 0), 0);
    setTotalAmount(sum);

    setLoading(false);
  }, [user, dateStart, dateEnd, category, fileId, sortAsc, page, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const clearFilters = () => {
    setDateStart("");
    setDateEnd("");
    setCategory("");
    setFileId("");
    setPage(1);
    setSearchParams({});
  };

  const exportCSV = () => {
    if (transactions.length === 0) return;
    const header = "Data,Merchant,Categoria,Valor,Descrição\n";
    const rows = transactions.map((t) =>
      `${t.transaction_date},"${t.merchant}",${t.category || ""},${t.amount},"${t.description || ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fileName = useMemo(() => {
    const map = new Map(files.map((f) => [f.id, f.file_name]));
    return (id: string | null) => (id ? map.get(id) || "—" : "—");
  }, [files]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>
          Transações Extraídas
        </h1>

        {/* Filters */}
        <Card className="card-glass">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Data início</Label>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data fim</Label>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Arquivo</Label>
                <Select value={fileId} onValueChange={(v) => { setFileId(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {files.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.file_name.length > 25 ? f.file_name.slice(0, 25) + "…" : f.file_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-9">
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
                <Button variant="outline" size="sm" onClick={exportCSV} className="h-9" disabled={transactions.length === 0}>
                  <Download className="h-3 w-3 mr-1" /> CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-1 text-sm">
            <span className="text-muted-foreground">
              Total: <strong className="text-primary">{formatCurrency(totalAmount)}</strong> em {total} transações
            </span>
          </div>
        )}

        {/* Table */}
        <Card className="card-glass">
          <CardContent className="p-0 sm:p-4">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-sm text-foreground font-medium">Nenhuma transação encontrada</p>
                <p className="text-xs text-muted-foreground">Faça upload de um PDF para extrair transações!</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Tabela de transações">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 px-3">
                          <button
                            onClick={() => setSortAsc(!sortAsc)}
                            className="flex items-center gap-1 text-muted-foreground font-medium hover:text-foreground transition-colors"
                            aria-sort={sortAsc ? "ascending" : "descending"}
                          >
                            Data <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Merchant</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Categoria</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Valor</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Arquivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="py-2.5 px-3 text-foreground">
                            {format(new Date(t.transaction_date + "T12:00:00"), "dd/MM/yyyy")}
                          </td>
                          <td className="py-2.5 px-3 text-foreground">{t.merchant}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{t.category || "—"}</td>
                          <td className="py-2.5 px-3 text-right text-foreground font-medium">
                            {formatCurrency(t.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs truncate max-w-[150px]">
                            {fileName(t.file_id)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-border/30">
                  {transactions.map((t) => (
                    <div key={t.id} className="p-3 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-foreground font-medium">{t.merchant}</span>
                        <span className="text-sm text-foreground font-bold">{formatCurrency(t.amount)}</span>
                      </div>
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span>{format(new Date(t.transaction_date + "T12:00:00"), "dd/MM/yyyy")}</span>
                        <span>{t.category || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 text-sm">
                    <span className="text-muted-foreground" aria-label={`Página ${page} de ${totalPages}`}>
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
    </AppLayout>
  );
}
