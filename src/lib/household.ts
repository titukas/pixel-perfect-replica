import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export const householdQuery = queryOptions({
  queryKey: ["household"],
  queryFn: async () => {
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) throw new Error("Not signed in");
    const userId = auth.user.id;
    const { data: householdId, error } = await supabase.rpc("ensure_household");
    if (error) throw error;
    const { data: members, error: mErr } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId);
    if (mErr) throw mErr;
    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("*").in("id", ids);
    if (pErr) throw pErr;
    const { data: terms } = await supabase.from("terms_acceptance").select("id").limit(1);
    const me = profiles?.find((p) => p.id === userId) ?? null;
    const partner = profiles?.find((p) => p.id !== userId) ?? null;
    return {
      userId,
      email: auth.user.email ?? "",
      householdId: householdId as string,
      me,
      partner,
      hasAcceptedTerms: (terms?.length ?? 0) > 0,
    };
  },
});

export const balanceQuery = (userId: string) =>
  queryOptions({
    queryKey: ["balance", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("balance_of", { _uid: userId });
      if (error) throw error;
      return data ?? 0;
    },
  });

export const choresQuery = (householdId: string) =>
  queryOptions({
    queryKey: ["chores", householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chores")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

export const rewardsQuery = (householdId: string) =>
  queryOptions({
    queryKey: ["rewards", householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("household_id", householdId)
        .order("cost");
      if (error) throw error;
      return data;
    },
  });

export function errorMessage(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong. Please try again.";
}

export const ACTIVE_COMPLETION_STATUSES = ["in_progress", "awaiting_verification"] as const;

export const activeCompletionsQuery = (householdId: string) =>
  queryOptions({
    queryKey: ["completions", householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chore_completions")
        .select("*")
        .eq("household_id", householdId)
        .in("status", [...ACTIVE_COMPLETION_STATUSES]);
      if (error) throw error;
      return data;
    },
  });

export const redemptionsQuery = (householdId: string) =>
  queryOptions({
    queryKey: ["redemptions", householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_redemptions")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

export const historyQuery = (userId: string) =>
  queryOptions({
    queryKey: ["history", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

export const notificationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

/** Seconds left on a running chore timer (0 when finished). */
export function secondsLeft(startedAt: string, timerSeconds: number, now = Date.now()) {
  const end = new Date(startedAt).getTime() + timerSeconds * 1000;
  return Math.max(0, Math.ceil((end - now) / 1000));
}

/** Net points = sum of all ledger amounts. */
export function ledgerBalance(rows: { amount: number }[]) {
  return rows.reduce((s, r) => s + r.amount, 0);
}
