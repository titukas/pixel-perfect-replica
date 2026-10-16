import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/household";
import { Button } from "@/components/ui/button";

export const EVIDENCE_BUCKET = "chore-photos";
export const DEFAULT_TIMER_SECONDS = 1800;
type Completion = { id: string; user_id: string; status: string } | null | undefined;
type Phase = "before" | "after";

/** Photos and videos attached to the chore's current attempt. */
export function ChorePhotos({ choreId, householdId, userId, completion, canStart, video }: {
  choreId: string; householdId: string; userId: string; completion?: Completion; canStart: boolean; video?: boolean;
}) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("before");
  const [accept, setAccept] = useState("image/*");
  const key = ["evidence", completion?.id ?? "none"];

  const media = useQuery({
    queryKey: key,
    enabled: !!completion,
    queryFn: async () => {
      const { data, error } = await supabase.from("verification_media").select("*").eq("completion_id", completion!.id).order("created_at");
      if (error) throw error;
      return Promise.all((data ?? []).map(async (m) => {
        const { data: s } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(m.storage_path, 3600);
        return { ...m, url: s?.signedUrl ?? "" };
      }));
    },
  });

  const mine = !!completion && completion.user_id === userId && completion.status === "in_progress";
  const canAdd = mine || (!completion && canStart);

  function pick(p: Phase, kind: "image" | "video") {
    setPhase(p); setAccept(kind === "image" ? "image/*" : "video/*");
    setTimeout(() => input.current?.click(), 0);
  }

  async function onFile(file: File) {
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "photo" : null;
    if (!kind) { toast.error("Please choose a photo or video"); return; }
    setBusy(true);
    try {
      let completionId = mine ? completion!.id : null;
      if (!completionId) {
        const { data, error } = await supabase.rpc("start_chore", { _chore: choreId, _seconds: DEFAULT_TIMER_SECONDS });
        if (error) throw error;
        completionId = data as string;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "photo" ? "jpg" : "mp4");
      const path = `${householdId}/${completionId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("verification_media").insert({
        completion_id: completionId, household_id: householdId, uploaded_by: userId, phase, kind, storage_path: path,
      });
      if (error) throw error;
      toast.success(`${phase === "before" ? "Before" : "After"} ${kind} added`);
      await qc.invalidateQueries({ queryKey: ["evidence"] });
      await qc.invalidateQueries({ queryKey: ["chores"] });
      await qc.invalidateQueries({ queryKey: ["completions"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(id: string, path: string) {
    await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
    const { error } = await supabase.from("verification_media").delete().eq("id", id);
    if (error) { toast.error(errorMessage(error)); return; }
    qc.invalidateQueries({ queryKey: key });
  }

  const items = media.data ?? [];
  if (!canAdd && items.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((m) => (
            <div key={m.id} className="relative shrink-0">
              {m.kind === "video"
                ? <video src={m.url} controls className="h-20 w-28 rounded-xl bg-muted object-cover" />
                : <a href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt={`${m.phase} photo`} className="size-20 rounded-xl object-cover" /></a>}
              <span className="absolute left-1 top-1 rounded bg-card/90 px-1 text-[10px] font-semibold capitalize">{m.phase}</span>
              {mine && (
                <button aria-label="Remove" onClick={() => remove(m.id, m.storage_path)} className="absolute right-1 top-1 rounded bg-card/90 p-0.5 text-destructive">
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {canAdd && (
        <div className="flex flex-wrap gap-1.5">
          <input ref={input} type="file" accept={accept} capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          {(["before", "after"] as const).map((p) => (
            <Button key={p} size="sm" variant="outline" disabled={busy || (p === "after" && !completion)} onClick={() => pick(p, "image")}>
              {busy && phase === p ? <Loader2 className="animate-spin" /> : <Camera />}{p === "before" ? "Before photo" : "After photo"}
            </Button>
          ))}
          {video && (["before", "after"] as const).map((p) => (
            <Button key={`v${p}`} size="sm" variant="outline" disabled={busy || (p === "after" && !completion)} onClick={() => pick(p, "video")}>
              <Video />{p === "before" ? "Before video" : "After video"}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
