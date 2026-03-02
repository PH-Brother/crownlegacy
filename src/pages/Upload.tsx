import { useState, useRef } from "react";
import { Upload as UploadIcon, FileText, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGamificacao } from "@/hooks/useGamificacao";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

export default function UploadPage() {
  const { user } = useAuth();
  const { adicionarPontos } = useGamificacao();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) {
      toast({ title: "Formato não suportado", description: "Use PDF, JPG, PNG ou WEBP", variant: "destructive" });
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleAnalisar = async () => {
    if (!file || !user) return;
    setAnalisando(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file);
      if (upErr) throw upErr;

      const { data } = await supabase.functions.invoke("gemini-proxy", {
        body: { tipo: "analise_fatura", dados: { filename: file.name, tipo: file.type } },
      });

      setResultado(data?.resultado || "Análise concluída. Revise os dados extraídos.");
      await adicionarPontos(user.id, 20, "upload_fatura", "Upload e análise de fatura");
      toast({ title: "✅ Análise concluída! +20 pontos" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro na análise", variant: "destructive" });
    } finally {
      setAnalisando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Upload de Fatura</h1>
        </div>

        <Card
          className="border-dashed border-2 border-primary/30 cursor-pointer hover:border-primary transition-colors card-glass"
          onClick={() => fileRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center gap-3 py-8">
            {file ? (
              <>
                {preview ? <img src={preview} alt="Preview" className="max-h-40 rounded-lg" /> : <FileText className="h-12 w-12 text-primary" />}
                <p className="text-sm text-foreground">{file.name}</p>
              </>
            ) : (
              <>
                <UploadIcon className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Toque para selecionar arquivo</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP</p>
              </>
            )}
          </CardContent>
        </Card>

        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFile} />

        {file && (
          <Button onClick={handleAnalisar} disabled={analisando} className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold">
            {analisando ? <Loader2 className="h-5 w-5 animate-spin" /> : "🤖 Analisar Fatura com IA"}
          </Button>
        )}

        {resultado && (
          <Card className="card-glass-gold">
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-primary mb-2">Resultado da Análise</h2>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{resultado}</p>
            </CardContent>
          </Card>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
