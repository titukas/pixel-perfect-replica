import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Coffee, Crown, CupSoda, Film, Gift, Hand, Heart, Sparkles, Timer } from "lucide-react";
import { householdQuery, rewardsQuery } from "@/lib/household";
import { APP_NAME } from "@/lib/app-config";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({ meta: [{ title: `Rewards — ${APP_NAME}` }, { name: "description", content: "Treats you can redeem with your points." }] }),
  component: RewardsPage,
});

export const REWARD_ICONS: Record<string, typeof Heart> = { hand: Hand, coffee: Coffee, cup: CupSoda, film: Film, sparkles: Sparkles, crown: Crown, heart: Heart, gift: Gift };

function RewardsPage() {
  const hh = useQuery(householdQuery);
  const rewards = useQuery({ ...rewardsQuery(hh.data?.householdId ?? ""), enabled: !!hh.data });

  return (
    <section>
      <h1 className="text-3xl">Rewards</h1>
      <p className="mt-1 text-sm text-muted-foreground">Acts of kindness, offered freely — your partner can always say no or suggest another time.</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rewards.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        {rewards.error && <p className="text-sm text-destructive">Couldn't load rewards.</p>}
        {rewards.data?.length === 0 && <p className="col-span-full rounded-2xl border border-dashed p-8 text-center text-muted-foreground">No rewards yet.</p>}
        {rewards.data?.map((r) => {
          const Icon = REWARD_ICONS[r.icon] ?? Heart;
          return (
            <article key={r.id} className="flex gap-4 rounded-2xl bg-card p-4 shadow-card">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Icon className="size-6" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg leading-snug">{r.title}</h2>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold/25 px-2.5 py-1 text-sm font-bold text-gold-foreground"><Sparkles className="size-3.5" />{r.cost}</span>
                </div>
                {r.description && <p className="mt-0.5 text-sm text-muted-foreground">{r.description}</p>}
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {r.duration_minutes && <span className="flex items-center gap-1"><Timer className="size-3" />{r.duration_minutes} min</span>}
                  <span>{r.active ? "Available" : "Paused"}</span>
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
