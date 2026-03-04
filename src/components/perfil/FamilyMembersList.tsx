import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Member {
  id: string;
  nome_completo: string;
  avatar_url: string | null;
  role: string | null;
}

const ROLE_EMOJI: Record<string, string> = {
  pai: "👨", mae: "👩", filho: "👦", filha: "👧", membro: "👤", admin: "👑",
};

interface FamilyMembersListProps {
  familiaId: string;
}

export default function FamilyMembersList({ familiaId }: FamilyMembersListProps) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, nome_completo, avatar_url, role")
      .eq("familia_id", familiaId)
      .then(({ data }) => { if (data) setMembers(data); });
  }, [familiaId]);

  if (members.length === 0) return null;

  return (
    <div className="space-y-2 mt-3">
      <p className="text-xs text-muted-foreground font-medium">Membros ({members.length})</p>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <div className="h-8 w-8 rounded-full gradient-gold flex items-center justify-center text-xs font-bold text-primary-foreground overflow-hidden">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                m.nome_completo?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <div>
              <p className="text-xs text-foreground font-medium">{m.nome_completo?.split(" ")[0]}</p>
              <p className="text-[10px] text-muted-foreground">
                {ROLE_EMOJI[m.role || ""] || "👤"} {m.role || "membro"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
