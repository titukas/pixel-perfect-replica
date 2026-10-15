import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, Crown, Heart, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/household";
import { APP_NAME } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({ code: z.string().optional() });

export const Route = createFileRoute("/accept")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: `Accept invitation — ${APP_NAME}` },
      { name: "description", content: "Accept your partner's invitation to connect." },
    ],
  }),
  component: AcceptInvitationPage,
});

type Preview = {
  valid: boolean;
  reason?: string;
  inviter_name?: string;
  expires_at?: string;
};

type Phase = "input" | "preview" | "connecting" | "success" | "error";

const REASON_MESSAGES: Record<string, string> = {
  not_found: "This invitation code wasn't found. Please check it and try again.",
  used: "This invitation has already been used.",
  revoked: "This invitation has been revoked.",
  expired: "This invitation has expired. Ask your partner for a new one.",
  own: "You can't accept your own invitation!",
};

function reasonMessage(reason?: string) {
  if (!reason) return "This invitation is no longer valid.";
  return REASON_MESSAGES[reason] ?? "This invitation is no longer valid.";
}

function AcceptInvitationPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState(search.code ?? "");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [phase, setPhase] = useState<Phase>(search.code ? "input" : "input");
  const [busy, setBusy] = useState(false);

  async function doPreview() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      toast.error("Please enter an invitation code");
      return;
    }
    setBusy(true);
    setPhase("input");
    const { data, error } = await supabase.rpc("preview_invitation", { _token: trimmed });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    const p = data as unknown as Preview;
    setPreview(p);
    if (p.valid) {
      setPhase("preview");
    } else {
      setPhase("error");
    }
  }

  async function doAccept() {
    const trimmed = code.trim().toUpperCase();
    setBusy(true);
    setPhase("connecting");
    const { error } = await supabase.rpc("accept_invitation", { _token: trimmed });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      setPhase("error");
      setPreview({ valid: false, reason: "not_found" });
      return;
    }
    setPhase("success");
    toast.success("You're now connected!");
    setTimeout(() => navigate({ to: "/chores", replace: true }), 1800);
  }

  function reset() {
    setCode("");
    setPreview(null);
    setPhase("input");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex flex-col items-center gap-2 text-center">
          <Crown className="size-9 text-gold" />
          <span className="font-display text-3xl">{APP_NAME}</span>
        </Link>
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          {phase === "success" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="size-14 text-success animate-pop" />
              <h1 className="text-2xl">Connected!</h1>
              <p className="text-sm text-muted-foreground">
                You and {preview?.inviter_name ?? "your partner"} are now a couple.
                Taking you to your chores…
              </p>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : phase === "preview" && preview?.valid ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <Heart className="size-10 fill-primary text-primary animate-pop" />
              <div>
                <h1 className="text-xl">You're invited!</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {preview.inviter_name}
                  </span>{" "}
                  wants to connect with you on {APP_NAME}.
                </p>
              </div>
              <div className="flex w-full gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={reset}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  variant="royal"
                  className="flex-1"
                  onClick={doAccept}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <Heart className="size-4" />}
                  Accept & connect
                </Button>
              </div>
            </div>
          ) : phase === "error" && preview ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <AlertCircle className="size-10 text-destructive" />
              <div>
                <h1 className="text-xl">Can't accept this invitation</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reasonMessage(preview.reason)}
                </p>
              </div>
              <div className="flex w-full gap-2">
                <Button variant="outline" className="flex-1" onClick={reset}>
                  Try another code
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/chores">Go home</Link>
                </Button>
              </div>
            </div>
          ) : phase === "connecting" ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Loader2 className="size-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Connecting you with your partner…</p>
            </div>
          ) : (
            <>
              <h1 className="text-center text-2xl">Accept invitation</h1>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                Enter the code your partner shared with you.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  doPreview();
                }}
                className="mt-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="code">Invitation code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ABCDEF2345"
                    className="text-center font-mono text-lg tracking-[0.15em]"
                    maxLength={10}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  variant="royal"
                  size="lg"
                  className="w-full"
                  disabled={busy || !code.trim()}
                >
                  {busy && <Loader2 className="animate-spin" />}
                  Check invitation
                </Button>
              </form>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                <Link to="/chores" className="underline">Back to home</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
