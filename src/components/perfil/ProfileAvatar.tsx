import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileAvatarProps {
  avatarUrl: string | null;
  nome: string;
  userId: string;
  onAvatarUpdated: (url: string) => void;
}

const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export default function ProfileAvatar({ avatarUrl, nome, userId, onAvatarUpdated }: ProfileAvatarProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = ACCEPTED_TYPES[file.type];
    if (!ext) {
      toast({ title: "Formato não suportado. Use JPG, PNG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "Arquivo muito grande. Máximo 2MB.", variant: "destructive" });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: signedData, error: signErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;

      await supabase.from("profiles").update({ avatar_url: signedData.signedUrl }).eq("id", userId);
      onAvatarUpdated(signedData.signedUrl);
      toast({ title: "📸 Avatar atualizado!" });
    } catch {
      setPreview(null);
      toast({ title: "Erro no upload do avatar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = preview || avatarUrl;
  const initial = nome?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative h-24 w-24 rounded-full gradient-gold flex items-center justify-center text-4xl text-primary-foreground font-bold overflow-hidden group transition-transform hover:scale-105"
      >
        {displayUrl ? (
          <img src={displayUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          initial
        )}

        {/* overlay */}
        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
          <Camera className="h-6 w-6 text-primary" />
        </div>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </button>
      <p className="text-xs text-muted-foreground">Toque para alterar foto</p>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}
