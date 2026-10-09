import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Crown, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { APP_NAME, GENDERS, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: `Sign in — ${APP_NAME}` },
      { name: "description", content: "Sign in or create your account to share chores and rewards with your partner." },
      { property: "og:title", content: `Sign in — ${APP_NAME}` },
      { property: "og:description", content: "Sign in or create your couples account." },
    ],
  }),
  component: AuthPage,
});

function safePath(p?: string) {
  if (!p) return "/chores";
  try {
    const u = new URL(p, window.location.origin);
    if (u.origin !== window.location.origin) return "/chores";
    return u.pathname + u.search;
  } catch {
    return "/chores";
  }
}

const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Please enter your name").max(50, "Max 50 characters"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"], { errorMap: () => ({ message: "Please choose an option" }) }),
  terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms to continue" }) }),
});
const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"displayName"|"email"|"password"|"gender"|"terms", string>>>({});
  const [sent, setSent] = useState<string | null>(null);
  const [form, setForm] = useState({ displayName: "", email: "", password: "", gender: "", terms: false });
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function collect(err: z.ZodError) {
    const e: Record<string, string> = {};
    for (const i of err.issues) e[String(i.path[0])] ??= i.message;
    setErrors(e);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErrors({});
    const dest = safePath(search.redirect);
    if (mode === "signup") {
      const r = signUpSchema.safeParse(form);
      if (!r.success) { collect(r.error); return; }
      setBusy(true);
      const { data, error } = await supabase.auth.signUp({
        email: r.data.email,
        password: r.data.password,
        options: {
          emailRedirectTo: window.location.origin + dest,
          data: { display_name: r.data.displayName, gender: r.data.gender, terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION },
        },
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) { navigate({ to: dest }); return; }
      setSent(`We sent a confirmation link to ${r.data.email}. Open it to finish creating your account.`);
    } else if (mode === "signin") {
      const r = signInSchema.safeParse(form);
      if (!r.success) { collect(r.error); return; }
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword(r.data);
      setBusy(false);
      if (error) { toast.error(error.message === "Invalid login credentials" ? "Email or password is incorrect" : error.message); return; }
      navigate({ to: dest });
    } else {
      const r = z.string().trim().email("Enter a valid email").safeParse(form.email);
      if (!r.success) { setErrors({ email: r.error.issues[0]?.message ?? "Invalid email" }); return; }
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(r.data, { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      setSent(`If an account exists for ${r.data}, a reset link is on its way.`);
    }
  }

  async function google() {
    if (search.redirect) sessionStorage.setItem("pp_redirect", safePath(search.redirect));
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error(res.error.message ?? "Google sign-in failed"); return; }
    if (res.redirected) return;
    navigate({ to: safePath(search.redirect) });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex flex-col items-center gap-2 text-center">
          <Crown className="size-9 text-gold" />
          <span className="font-display text-3xl">{APP_NAME}</span>
        </Link>
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto size-10 text-primary" />
              <p className="mt-3 text-sm">{sent}</p>
              <Button variant="ghost" className="mt-4" onClick={() => { setSent(null); setMode("signin"); }}>Back to sign in</Button>
            </div>
          ) : (
            <>
              <h1 className="text-center text-2xl">
                {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
              </h1>
              <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
                {mode === "signup" && (
                  <Field label="Display name" error={errors.displayName}>
                    <Input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} autoComplete="nickname" maxLength={50} />
                  </Field>
                )}
                <Field label="Email" error={errors.email}>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
                </Field>
                {mode !== "forgot" && (
                  <Field label="Password" error={errors.password}>
                    <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                  </Field>
                )}
                {mode === "signup" && (
                  <>
                    <Field label="Gender" error={errors.gender}>
                      <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                        <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div>
                      <label className="flex items-start gap-3 text-sm">
                        <Checkbox checked={form.terms} onCheckedChange={(v) => set("terms", v === true)} className="mt-0.5" />
                        <span>I accept the <Link to="/terms" target="_blank" className="text-primary underline">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>.</span>
                      </label>
                      {errors.terms && <p className="mt-1 text-xs text-destructive">{errors.terms}</p>}
                    </div>
                  </>
                )}
                <Button type="submit" variant="royal" size="lg" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                </Button>
              </form>
              {mode !== "forgot" && (
                <>
                  <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
                  <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
                </>
              )}
              <div className="mt-5 space-y-1 text-center text-sm">
                {mode === "signin" && (
                  <>
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => setMode("forgot")}>Forgot password?</button>
                    <p>New here? <button className="font-semibold text-primary" onClick={() => setMode("signup")}>Create an account</button></p>
                  </>
                )}
                {mode !== "signin" && (
                  <p>Already have an account? <button className="font-semibold text-primary" onClick={() => setMode("signin")}>Sign in</button></p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
