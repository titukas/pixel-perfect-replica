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
