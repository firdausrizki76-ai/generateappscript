import { SupabaseClient } from "@supabase/supabase-js";

export interface QuotaCycleInfo {
  cycleId: string;
  plan: "free" | "pro" | "business";
  limit: number;
  chatLimit: number;
}

export const PLAN_LIMITS: Record<string, number> = { free: 1, pro: 10, business: 30 };
export const CHAT_LIMITS: Record<string, number> = { free: 0, pro: 50, business: 150 };

/**
 * Calculates the current quota billing cycle ID and limits for a user.
 * 
 * - For Free tier: resets every 30 days starting from profiles.created_at.
 *   cycleId: `free-YYYY-MM-DD` (where YYYY-MM-DD is the start date of the current 30-day window)
 * - For Pro/Business tier: bound to the active subscription period (status = 'active' and expires_at > now).
 *   cycleId: `sub-UUID` (where UUID is the subscription id)
 *   If no active subscription record is found (e.g. manual upgrade/local testing), falls back to plan-YYYY-MM-DD.
 */
export async function getUserQuotaCycle(
  supabase: SupabaseClient,
  userId: string,
  profileInput?: { plan?: string; created_at?: string } | null
): Promise<QuotaCycleInfo> {
  let profile = profileInput;
  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .select("plan, created_at")
      .eq("id", userId)
      .single();
    profile = data;
  }

  const plan = (profile?.plan || "free") as "free" | "pro" | "business";
  const limit = PLAN_LIMITS[plan] || 1;
  const chatLimit = CHAT_LIMITS[plan] || 0;

  if (plan === "free") {
    const createdAt = new Date(profile?.created_at || new Date());
    const now = new Date();
    const msDiff = now.getTime() - createdAt.getTime();
    const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    const cycleNumber = Math.max(0, Math.floor(daysDiff / 30));
    const cycleStartDate = new Date(createdAt.getTime() + cycleNumber * 30 * 24 * 60 * 60 * 1000);
    const cycleStartDateStr = cycleStartDate.toISOString().substring(0, 10);

    return {
      cycleId: `free-${cycleStartDateStr}`,
      plan,
      limit,
      chatLimit,
    };
  } else {
    // Pro or Business: search for active subscription
    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("id, started_at, expires_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("started_at", { ascending: false })
      .limit(1);

    if (activeSubs && activeSubs.length > 0) {
      return {
        cycleId: `sub-${activeSubs[0].id}`,
        plan,
        limit,
        chatLimit,
      };
    }

    // Fallback for manual upgrade / demo mode where active subscription doesn't exist
    const createdAt = new Date(profile?.created_at || new Date());
    const now = new Date();
    const msDiff = now.getTime() - createdAt.getTime();
    const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    const cycleNumber = Math.max(0, Math.floor(daysDiff / 30));
    const cycleStartDate = new Date(createdAt.getTime() + cycleNumber * 30 * 24 * 60 * 60 * 1000);
    const cycleStartDateStr = cycleStartDate.toISOString().substring(0, 10);

    return {
      cycleId: `${plan}-${cycleStartDateStr}`,
      plan,
      limit,
      chatLimit,
    };
  }
}
