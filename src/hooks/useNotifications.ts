import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useNotifications() {
  const { user } = useAuth();
  const [unreadInsightsCount, setUnreadInsightsCount] = useState(0);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;

    const [insightsRes, invitesRes] = await Promise.all([
      supabase
        .from("ai_behavior_insights")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
      supabase
        .from("family_invites")
        .select("id", { count: "exact", head: true })
        .eq("email", user.email ?? "")
        .eq("status", "pending"),
    ]);

    setUnreadInsightsCount(insightsRes.count ?? 0);
    setPendingInvitesCount(invitesRes.count ?? 0);
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchCounts();

    if (!user?.id) return;

    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_behavior_insights", filter: `user_id=eq.${user.id}` }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "family_invites" }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchCounts]);

  return { unreadInsightsCount, pendingInvitesCount, refetchNotifications: fetchCounts };
}
