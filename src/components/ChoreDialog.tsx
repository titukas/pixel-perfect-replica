import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { errorMessage } from "@/lib/household";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  title: z.string().trim().min(1, "Title required").max(80),
  description: z.string().trim().max(500),
  points: z.coerce.number().int().min(1, "At least 1 point").max(1000, "Max 1000 points"),
  verification_method: z.enum(["partner", "photo", "video", "self"]),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]),
  assigned: z.enum(["anyone", "me", "partner"]),
});

export function ChoreDialog({ open, onOpenChange, chore, householdId, userId, partnerId, partnerName }: {
  open: boolean; onOpenChange: (v: boolean) => void; chore: Tables<"chores"> | null;
  householdId: string; userId: string; partnerId: string | null; partnerName: string;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: "", description: "", points: "10", verification_method: "partner", recurrence: "none", assigned: "anyone" });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF(chore ? {
      title: chore.title, description: chore.description, points: String(chore.points), verification_method: chore.verification_method,
      recurrence: chore.recurrence ?? "none",
      assigned: !chore.assigned_to ? "anyone" : chore.assigned_to === userId ? "me" : "partner",
    } : { title: "", description: "", points: "10", verification_method: "partner", recurrence: "none", assigned: "anyone" });
  }, [open, chore, userId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Check the form"); return; }
    const v = r.data;
    const row = {
      title: v.title, description: v.description, points: v.points, verification_method: v.verification_method,
      recurrence: v.recurrence === "none" ? null : v.recurrence,
      assigned_to: v.assigned === "me" ? userId : v.assigned === "partner" ? partnerId : null,
    };
    setBusy(true);
    const { error } = chore
      ? await supabase.from("chores").update({ ...row, updated_at: new Date().toISOString() }).eq("id", chore.id)
      : await supabase.from("chores").insert({ ...row, household_id: householdId, created_by: userId });
    setBusy(false);
    if (error) { toast.error(errorMessage(error)); return; }
    toast.success(chore ? "Chore updated" : "Chore added");
    qc.invalidateQueries({ queryKey: ["chores"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{chore ? "Edit chore" : "New chore"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="ct">Title</Label><Input id="ct" value={f.title} maxLength={80} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="cd">Description</Label><Textarea id="cd" value={f.description} maxLength={500} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="cp">Points</Label><Input id="cp" type="number" min={1} max={1000} value={f.points} onChange={(e) => set("points", e.target.value)} /></div>
            <Pick label="Repeats" value={f.recurrence} onChange={(v) => set("recurrence", v)} options={[["none", "Never"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]]} />
            <Pick label="Proof" value={f.verification_method} onChange={(v) => set("verification_method", v)} options={[["partner", "Partner confirms"], ["photo", "Before & after photos"], ["video", "Video evidence"], ["self", "Self-reported"]]} />
            <Pick label="Who" value={f.assigned} onChange={(v) => set("assigned", v)} options={[["anyone", "Shared"], ["me", "Me"], ...(partnerId ? [["partner", partnerName] as [string, string]] : [])]} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="royal" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{chore ? "Save" : "Add chore"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Pick({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
