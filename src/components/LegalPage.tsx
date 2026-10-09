import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function LegalPage({ title, version, children }: { title: string; version: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-10">
      <article className="mx-auto max-w-2xl space-y-4 rounded-3xl bg-card p-6 text-sm leading-relaxed shadow-card sm:p-10">
        <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <h1 className="text-3xl">{title}</h1>
        <p className="text-xs text-muted-foreground">Version {version} · Draft — have this reviewed by a legal professional before launch.</p>
        {children}
      </article>
    </div>
  );
}
