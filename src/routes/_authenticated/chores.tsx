import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, CheckCircle2, Clock, Repeat, Sparkles, User, Users } from "lucide-react";
import { householdQuery, choresQuery } from "@/lib/household";
import { APP_NAME } from "@/lib/app-config";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/chores")({
  head: () => ({ meta: [{ title: `Chores — ${APP_NAME}` }, { name: "description", content: "Your shared household chores." }] }),
  component: ChoresPage,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  available: { label: "Available", cls: "bg-secondary text-secondary-foreground" },
  in_progress: { label: "In progress", cls: "bg-gold/30 text-gold-foreground" },
  awaiting_verification: { label: "Awaiting review", cls: "bg-accent text-accent-foreground" },
  completed: { label: "Completed", cls: "bg-success/15 text-success" },
  disputed: { label: "Needs another look", cls: "bg-destructive/10 text-destructive" },
};
const VERIFY: Record<string, string> = { partner: "Partner confirms", photo: "Before & after photos", video: "Video evidence", self: "Self-reported" };

function ChoresPage() {
  const hh = useQuery(householdQuery);
  const chores = useQuery({ ...choresQuery(hh.data?.householdId ?? ""), enabled: !!hh.data });
  const name = (id: string | null) => (!id ? "Shared" : id === hh.data?.userId ? "You" : hh.data?.partner?.display_name ?? "Partner");

  return (
    <section>
      <h1 className="text-3xl">Chores</h1>
      <p className="mt-1 text-sm text-muted-foreground">Little things, done with love.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {chores.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        {chores.error && <p className="text-sm text-destructive">Couldn't load chores.</p>}
        {chores.data?.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto size-8 text-lavender" />
            <p className="mt-2">No chores yet.</p>
          </div>
        )}
        {chores.data?.map((c) => {
          const s = STATUS[c.status];
          return (
            <article key={c.id} className="rounded-2xl bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg leading-snug">{c.title}</h2>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold/25 px-2.5 py-1 text-sm font-bold text-gold-foreground">
                  <Sparkles className="size-3.5" />{c.points}
                </span>
              </div>
              {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <Badge variant="outline" className={`border-0 ${s.cls}`}>{s.label}</Badge>
                <Badge variant="outline" className="gap-1">{c.assigned_to ? <User className="size-3" /> : <Users className="size-3" />}{name(c.assigned_to)}</Badge>
                <Badge variant="outline" className="gap-1">{c.verification_method === "video" || c.verification_method === "photo" ? <Camera className="size-3" /> : <CheckCircle2 className="size-3" />}{VERIFY[c.verification_method]}</Badge>
                {c.recurrence && <Badge variant="outline" className="gap-1 capitalize"><Repeat className="size-3" />{c.recurrence}</Badge>}
                {c.due_date && <Badge variant="outline" className="gap-1"><Clock className="size-3" />{c.due_date}</Badge>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
