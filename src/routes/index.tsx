import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Gift, Heart, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import crowns from "@/assets/crowns.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Chores & rewards for two` },
      { name: "description", content: "A private, playful app for couples: share chores, earn points, and treat each other to acts of kindness." },
      { property: "og:title", content: `${APP_NAME} — Chores & rewards for two` },
      { property: "og:description", content: "Share chores, earn points, and treat each other to acts of kindness." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const saved = sessionStorage.getItem("pp_redirect");
        sessionStorage.removeItem("pp_redirect");
        navigate({ to: saved && saved.startsWith("/") && !saved.startsWith("//") ? saved : "/chores", replace: true });
      }
    });
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-6 py-12 text-center">
      <img src={crowns} alt="" width={1024} height={1024} className="w-56 sm:w-72" />
      <h1 className="mt-2 text-5xl sm:text-6xl">{APP_NAME}</h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">Share the chores. Earn points. Treat each other like royalty.</p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button asChild variant="royal" size="lg"><Link to="/auth">Get started</Link></Button>
      </div>
      <ul className="mt-12 grid max-w-2xl gap-4 text-left sm:grid-cols-3">
        {[
          { icon: ListChecks, t: "Shared chores", d: "Plan, start and finish tasks together." },
          { icon: Heart, t: "Gentle check-ins", d: "Your partner reviews and celebrates." },
          { icon: Gift, t: "Sweet rewards", d: "Massages, breakfast in bed and more." },
        ].map(({ icon: I, t, d }) => (
          <li key={t} className="rounded-2xl bg-card/80 p-4 shadow-card">
            <I className="size-5 text-primary" />
            <p className="mt-2 font-display text-lg">{t}</p>
            <p className="text-sm text-muted-foreground">{d}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
