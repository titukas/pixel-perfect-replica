import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: `Set a new password — ${APP_NAME}` },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: `Set a new password — ${APP_NAME}` },
      { property: "og:description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/chores" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <form onSubmit={save} className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-6 shadow-soft">
        <h1 className="text-center text-2xl">Set a new password</h1>
        {!ready ? (
          <p className="text-center text-sm text-muted-foreground">Open this page from the reset link in your email. Links expire after a short time.</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            </div>
            <Button type="submit" variant="royal" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Save password
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
