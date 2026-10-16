import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/household";
import { Button } from "@/components/ui/button";

const BUCKET = "chore-photos";
const DEFAULT_TIMER_SECONDS = 1800;

export function ChorePhotos({ choreId, householdId, userId, canStart }: { choreId: string; householdId: string; userId: string; canStart: boolean }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const key = ["chore-photos", choreId];

  const photos = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: comps, error } = await supabase
        .from("chore_completions")
        .select("id, user_id, status")
        .eq("chore_id", choreId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const comp = comps?.[0];
      if (!comp) return { completion: null, items: [] as { id: string; phase: string; url: string }[] };
      const { data: media, error: mErr } = await supabase
        .from("verification_media")
        .select("id, phase, storage_path")
        .eq("completion_id", comp.id)
        .eq("kind", "photo")
        .order("created_at");
      if (mErr) throw mErr;
      const items = await Promise.all(
        (media ?? []).map(async (m) => {
          const { data } = await supabase.storage.from(BUCKET).createSignedUrl(m.storage_path, 3600);
          return { id: m.id, phase: m.phase, url: data?.signedUrl ?? "" };
        }),
      );
      return { completion: comp, items };
    },
  });

  const comp = photos.data?.completion;
  const mine = comp && comp.user_id === userId && ["in_progress", "awaiting_verification"].includes(comp.status);
  const canTake = mine || canStart;

  async function onFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please choose a photo"); return; }
    setBusy(true);
    try {
      let completionId = mine ? comp!.id : null;
      if (!completionId) {
        const { data, error } = await supabase.rpc("start_chore", { _chore: choreId, _seconds: DEFAULT_TIMER_SECONDS });
        if (error) throw error;
        completionId = data as string;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${householdId}/${completionId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const phase = (photos.data?.items.length ?? 0) > 0 && mine ? "after" : "before";
      const { error } = await supabase.from("verification_media").insert({
        completion_id: completionId, household_id: householdId, uploaded_by: userId, phase, kind: "photo", storage_path: path,
      });
      if (error) throw error;
      toast.success("Photo added");
      await Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ["chores"] })]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="mt-3">
      {!!photos.data?.items.length && (
        <div className="mb-2 flex gap-2 overflow-x-auto">
          {photos.data.items.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="relative shrink-0">
              <img src={p.url} alt={`${p.phase} photo`} className="size-16 rounded-xl object-cover" />
              <span className="absolute bottom-0.5 left-0.5 rounded bg-card/90 px-1 text-[10px] capitalize">{p.phase}</span>
            </a>
          ))}
        </div>
      )}
      {canTake && (
        <>
          <input ref={input} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="animate-spin" /> : <Camera />}Take photo
          </Button>
        </>
      )}
    </div>
  );
}
