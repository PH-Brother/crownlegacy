import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useWealthGoals, WealthGoal } from "@/hooks/useWealthGoals";
import { useNetWorth } from "@/hooks/useNetWorth";
import GoalCard from "@/components/GoalCard";
import { GOAL_TYPES, GOAL_PRIORITIES } from "@/utils/goalHelpers";

export default function Goals() {
  const navigate = useNavigate();
  const { goals, loading, createGoal, updateGoal, completeGoal, deleteGoal } = useWealthGoals();
  const { assets } = useNetWorth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<WealthGoal | null>(null);
  const [tab, setTab] = useState("active");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [linkedAsset, setLinkedAsset] = useState("");
  const [priority, setPriority] = useState("1");
  const [verse, setVerse] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle(""); setDescription(""); setType(""); setTargetValue("");
    setCurrentValue(""); setTargetDate(""); setLinkedAsset(""); setPriority("1"); setVerse("");
  };

  const openCreate = () => { resetForm(); setEditGoal(null); setDialogOpen(true); };

  const openEdit = (id: string) => {
    const g = goals.find((goal) => goal.id === id);
    if (!g) return;
    setEditGoal(g);
    setTitle(g.title); setDescription(g.description || ""); setType(g.type);
    setTargetValue(String(g.target_value)); setCurrentValue(String(g.current_value));
    setTargetDate(g.target_date); setLinkedAsset(g.linked_asset_id || "");
    setPriority(String(g.priority)); setVerse(g.motivational_verse || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title, description: description || null, type,
      target_value: parseFloat(targetValue), current_value: parseFloat(currentValue) || 0,
      target_date: targetDate, linked_asset_id: linkedAsset || null,
      priority: parseInt(priority), status: editGoal?.status || "active",
      motivational_verse: verse || null, family_id: null,
    };
    if (editGoal) { await updateGoal(editGoal.id, payload); }
    else { await createGoal(payload); }
    setSaving(false);
    setDialogOpen(false);
    resetForm();
  };

  const filtered = goals.filter((g) => {
    if (tab === "active") return g.status === "active";
    if (tab === "completed") return g.status === "completed";
    if (tab === "archived") return g.status === "archived";
    return true;
  });

  const today = new Date().toISOString().split("T")[0];
  const canSave = title.length >= 5 && type && parseFloat(targetValue) > 0 && targetDate >= today;

  return (
    <div className="mx-auto max-w-[520px] px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground font-display">Metas de Patrimônio</h1>
        </div>
        <Button size="sm" className="btn-premium" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Construa seu legado com objetivos claros</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">Ativas ({goals.filter((g) => g.status === "active").length})</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">Completadas ({goals.filter((g) => g.status === "completed").length})</TabsTrigger>
          <TabsTrigger value="archived" className="flex-1">Arquivadas ({goals.filter((g) => g.status === "archived").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-12 w-12 mx-auto mb-3 text-primary/40" />
          <p className="text-muted-foreground">Nenhuma meta {tab === "active" ? "ativa" : tab === "completed" ? "completada" : "arquivada"}</p>
          {tab === "active" && (
            <Button size="sm" className="mt-3 btn-premium" onClick={openCreate}>Criar primeira meta</Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={openEdit} onComplete={completeGoal} onDelete={deleteGoal} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Min. 5 caracteres" className="input-premium" maxLength={100} />
              {title.length > 0 && title.length < 5 && <p className="text-xs text-destructive">Mínimo 5 caracteres</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva sua meta" className="input-premium" rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="input-premium"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{GOAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Valor Alvo (R$) *</Label>
                <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} min="0" step="0.01" className="input-premium" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor Atual (R$)</Label>
                <Input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} min="0" step="0.01" className="input-premium" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Alvo *</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} min={today} className="input-premium" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vincular a Ativo</Label>
              <Select value={linkedAsset} onValueChange={setLinkedAsset}>
                <SelectTrigger className="input-premium"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prioridade *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="input-premium"><SelectValue /></SelectTrigger>
                <SelectContent>{GOAL_PRIORITIES.map((p) => <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Versículo motivacional</Label>
              <Textarea value={verse} onChange={(e) => setVerse(e.target.value)} placeholder="Opcional" className="input-premium" rows={2} maxLength={500} />
            </div>
            <Button onClick={handleSave} disabled={saving || !canSave} className="w-full btn-premium">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editGoal ? "Salvar Alterações" : "Criar Meta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
