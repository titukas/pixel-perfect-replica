import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Heart, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { householdQuery, errorMessage } from "@/lib/household";
import { APP_NAME, GENDERS } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: `Profile — ${APP_NAME}` }, { name: "description", content: "Your profile and settings." }] }),
  component: ProfilePage,
});

const schema = z.object({ display_name: z.string().trim().min(1, "Name required").max(50), gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]) });

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const hh = useQuery(householdQuery);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("prefer_not_to_say");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hh.data?.me) { setName(hh.data.me.display_name); setGender(hh.data.me.gender); }
  }, [hh.data?.me]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse({ display_name: name, gender });
    if (!r.success) return toast.error(r.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ ...r.data, updated_at: new Date().toISOString() }).eq("id", hh.data!.userId);
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["household"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl">Profile</h1>
      <form onSubmit={save} className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
        <div className="space-y-1.5"><Label htmlFor="n">Display name</Label><Input id="n" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">Signed in as {hh.data?.email}</p>
        <Button type="submit" variant="royal" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save changes</Button>
      </form>

      <div className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-xl"><Heart className="size-5 text-primary" /> Partner</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hh.data?.partner ? `Connected with ${hh.data.partner.display_name}.` : "You're not connected yet. Partner invitations with QR codes arrive in the next step."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/terms" className="text-primary underline">Terms of Service</Link>
        <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>
      </div>
      <Button variant="outline" onClick={signOut}><LogOut /> Sign out</Button>
    </section>
  );
}
