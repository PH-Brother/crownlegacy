import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Building2, AlertCircle, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useFamiliaId } from "@/hooks/useFamiliaId";
import { useNetWorth, type Asset } from "@/hooks/useNetWorth";
import { formatCurrency } from "@/utils/formatters";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_COLORS: Record<string, string> = {
  "Imóveis": "hsl(144,48%,19%)",
  "Investimentos": "hsl(160,84%,39%)",
  "Veículos": "hsl(200,80%,55%)",
  "Criptomoedas": "hsl(43,65%,52%)",
  "Conta Bancária": "hsl(25,95%,55%)",
  "Negócio": "hsl(340,70%,55%)",
  "Previdência": "hsl(170,70%,45%)",
  "Outros": "hsl(220,14%,46%)",
};

const TYPES = [
  { value: "real_estate", label: "Imóvel" },
  { value: "investment", label: "Investimento" },
  { value: "business", label: "Negócio" },
  { value: "crypto", label: "Criptomoeda" },
  { value: "cash", label: "Conta Bancária" },
  { value: "vehicle", label: "Veículo" },
  { value: "other", label: "Outro" },
];

const CATEGORIES = ["Imóveis", "Investimentos", "Veículos", "Criptomoedas", "Conta Bancária", "Negócio", "Previdência", "Outros"];
const LIQUIDITY = [
  { value: "high", label: "Alta", color: "text-success" },
  { value: "medium", label: "Média", color: "text-accent" },
  { value: "low", label: "Baixa", color: "text-destructive" },
];

interface FormData {
  name: string;
  type: string;
  category: string;
  value: string;
  currency: string;
  institution: string;
  liquidity: string;
  notes: string;
}

const emptyForm: FormData = { name: "", type: "", category: "", value: "", currency: "BRL", institution: "", liquidity: "low", notes: "" };

export default function Assets() {
  const { user } = useAuth();
  const { familiaId } = useFamiliaId();
  const { assets, loading, error, totalAssets, refetch, createNetWorthSnapshot } = useNetWorth();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("Todos");

  const openAdd = () => { setEditingAsset(null); setForm(emptyForm); setFormErrors({}); setModalOpen(true); };
  const openEdit = (a: Asset) => {
    setEditingAsset(a);
    setForm({
      name: a.name, type: a.type, category: a.category,
      value: String(a.value), currency: a.currency || "BRL",
      institution: a.institution || "", liquidity: a.liquidity || "low", notes: a.notes || "",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name || form.name.length < 3) e.name = "Nome deve ter ao menos 3 caracteres";
    if (!form.type) e.type = "Selecione o tipo";
    if (!form.category) e.category = "Selecione a categoria";
    const val = Number(form.value);
    if (!form.value || isNaN(val) || val <= 0) e.value = "Valor deve ser maior que 0";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user?.id) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name, type: form.type, category: form.category,
        value: Number(form.value), currency: form.currency,
        institution: form.institution || null, liquidity: form.liquidity,
        notes: form.notes || null, owner_id: user.id,
        family_id: familiaId || null, is_active: true,
      };
      if (editingAsset) {
        const { error: err } = await supabase.from("assets").update(payload).eq("id", editingAsset.id).eq("owner_id", user.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("assets").insert(payload);
        if (err) throw err;
      }
      toast({ title: "✅ Ativo salvo com sucesso" });
      setModalOpen(false);
      refetch();
      setTimeout(() => createNetWorthSnapshot(), 1000);
    } catch {
      toast({ title: "Erro ao salvar ativo", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user?.id) return;
    try {
      const { data: linked } = await supabase.from("wealth_goals").select("id").eq("linked_asset_id", deleteId).limit(1);
      if (linked && linked.length > 0) {
        toast({ title: "Este ativo está vinculado a uma meta. Remova a vinculação antes de deletar.", variant: "destructive" });
        setDeleteId(null);
        return;
      }
      const { error: err } = await supabase.from("assets").update({ is_active: false }).eq("id", deleteId).eq("owner_id", user.id);
      if (err) throw err;
      toast({ title: "Ativo removido" });
      refetch();
      setTimeout(() => createNetWorthSnapshot(), 1000);
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const chartData = CATEGORIES.map((cat) => ({
    name: cat,
    value: assets.filter((a) => a.category === cat).reduce((s, a) => s + Number(a.value), 0),
  })).filter((d) => d.value > 0);

  const filteredAssets = activeTab === "Todos" ? assets : assets.filter((a) => a.category === activeTab);

  return (
    <div className="mx-auto max-w-[600px] px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Meus Ativos</h1>
          <p className="text-sm text-muted-foreground">Total: <span className="font-mono font-semibold text-accent">{formatCurrency(totalAssets)}</span></p>
        </div>
        <Button onClick={openAdd} className="btn-premium gap-1 min-h-[44px]">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive flex-1">Erro ao carregar ativos</p>
            <Button size="sm" variant="outline" onClick={refetch}><RefreshCw className="h-3 w-3" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Donut Chart */}
      {loading ? (
        <Skeleton className="h-[250px] w-full rounded-2xl" />
      ) : chartData.length > 0 ? (
        <Card className="card-premium">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Alocação por Categoria</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} onClick={(d) => setActiveTab(d.name)}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "hsl(220,14%,46%)"} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {chartData.map((d) => (
                <button key={d.name} onClick={() => setActiveTab(d.name)} className="flex items-center gap-1.5 text-xs hover:opacity-80">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[d.name] }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium font-mono text-foreground">{formatCurrency(d.value)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-premium">
          <CardContent className="p-8 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Adicione seus primeiros ativos</p>
            <Button onClick={openAdd} className="btn-premium gap-1"><Plus className="h-4 w-4" /> Adicionar ativo</Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {assets.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto flex justify-start bg-muted/50 h-auto p-1">
            <TabsTrigger value="Todos" className="text-xs">Todos</TabsTrigger>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c} className="text-xs whitespace-nowrap">{c}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Asset List */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filteredAssets.length === 0 && assets.length > 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum ativo nesta categoria</p>
      ) : (
        <div className="space-y-2">
          {filteredAssets.map((a) => {
            const liq = LIQUIDITY.find((l) => l.value === a.liquidity);
            return (
              <Card key={a.id} className="card-premium hover:border-primary/30 transition-colors">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${CATEGORY_COLORS[a.category] || "hsl(220,14%,46%)"}20` }}>
                    <Building2 className="h-5 w-5" style={{ color: CATEGORY_COLORS[a.category] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                    <div className="flex items-center gap-2">
                      {a.institution && <p className="text-xs text-muted-foreground truncate">{a.institution}</p>}
                      {liq && <Badge variant="outline" className={`text-[9px] px-1 py-0 ${liq.color}`}>{liq.label}</Badge>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold font-mono text-foreground">{formatCurrency(Number(a.value))}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(a)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteId(a.id)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editingAsset ? "Editar Ativo" : "Novo Ativo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-2">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do ativo" className="input-premium" />
              {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="input-premium"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                {formErrors.type && <p className="text-xs text-destructive mt-1">{formErrors.type}</p>}
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="input-premium"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                {formErrors.category && <p className="text-xs text-destructive mt-1">{formErrors.category}</p>}
              </div>
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0,00" className="input-premium" />
              {formErrors.value && <p className="text-xs text-destructive mt-1">{formErrors.value}</p>}
            </div>
            <div>
              <Label>Instituição</Label>
              <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="Instituição (opcional)" className="input-premium" />
            </div>
            <div>
              <Label>Liquidez *</Label>
              <Select value={form.liquidity} onValueChange={(v) => setForm({ ...form, liquidity: v })}>
                <SelectTrigger className="input-premium"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIQUIDITY.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas (opcional)" className="input-premium" rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="btn-premium min-h-[44px]">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar este ativo?</AlertDialogTitle>
            <AlertDialogDescription>O ativo será desativado e não aparecerá mais na listagem.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
