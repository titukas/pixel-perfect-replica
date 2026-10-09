import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Gift, Heart, ListChecks, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { householdQuery, balanceQuery, errorMessage } from "@/lib/household";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/app-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function initials(name?: string | null) {
  return (name ?? "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AppShell({ children }: { children: ReactNode }) {
  const hh = useQuery(householdQuery);
  const bal = useQuery({ ...balanceQuery(hh.data?.userId ?? ""), enabled: !!hh.data });

  if (hh.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (hh.error || !hh.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground">We couldn't load your household. {errorMessage(hh.error)}</p>
        <Button onClick={() => hh.refetch()}>Try again</Button>
      </div>
    );
  }
  const { me, partner } = hh.data;
  if (!hh.data.hasAcceptedTerms) return <TermsGate />;

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/profile" aria-label="Profile and settings" className="rounded-full ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-10 border-2 border-gold">
              {me?.avatar_url && <AvatarImage src={me.avatar_url} alt="" />}
              <AvatarFallback className="bg-accent font-semibold text-accent-foreground">{initials(me?.display_name)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">{me?.display_name}</p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              {partner ? (
                <><Heart className="size-3 fill-primary text-primary" /> with {partner.display_name}</>
              ) : (
                <Link to="/profile" className="underline-offset-2 hover:underline">Not connected yet · invite partner</Link>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-gold/25 px-3 py-1.5 font-semibold text-gold-foreground shadow-card" aria-label="Your points">
            <Sparkles className="size-4" />
            <span className="tabular-nums">{bal.data ?? "—"}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/95 backdrop-blur" aria-label="Main">
        <div className="mx-auto grid max-w-3xl grid-cols-2">
          <NavTab to="/chores" icon={<ListChecks className="size-5" />} label="Chores" />
          <NavTab to="/rewards" icon={<Gift className="size-5" />} label="Rewards" />
        </div>
      </nav>
    </div>
  );
}

function NavTab({ to, icon, label }: { to: "/chores" | "/rewards"; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-0.5 py-3 text-xs font-semibold text-muted-foreground transition-colors"
      activeProps={{ className: "text-primary" }}
    >
      {icon}
      {label}
    </Link>
  );
}

function TermsGate() {
  const qc = useQueryClient();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    const { error } = await supabase.rpc("accept_terms", { _terms: TERMS_VERSION, _privacy: PRIVACY_VERSION });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    qc.invalidateQueries({ queryKey: ["household"] });
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-6">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-soft">
        <Crown className="mx-auto size-8 text-gold" />
        <h1 className="mt-3 text-2xl">Welcome to {APP_NAME}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Before you continue, please review and accept our terms.</p>
        <label className="mt-5 flex items-start gap-3 text-left text-sm">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
          <span>
            I accept the <Link to="/terms" className="text-primary underline">Terms of Service</Link> and{" "}
            <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
          </span>
        </label>
        <Button variant="royal" size="lg" className="mt-5 w-full" disabled={!agree || busy} onClick={accept}>
          {busy && <Loader2 className="animate-spin" />} Continue
        </Button>
      </div>
    </div>
  );
}
