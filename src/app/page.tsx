import Link from "next/link";
import { Camera, LayoutDashboard, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
        <header className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
              <Sparkles className="h-4 w-4 text-primary" />
              Lumen Booth Platform
            </span>
          </div>
          <div className="flex flex-col gap-6">
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              Modern photobooth experiences for guests and admins in one flow.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Launch immersive booth sessions, apply overlays, and track usage in
              a beautiful dashboard powered by Supabase.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link href="/booth">
                  <Camera className="h-4 w-4" />
                  Open Booth
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/admin">
                  <LayoutDashboard className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Live Capture",
              body: "Capture sessions with guided prompts and animated transitions.",
            },
            {
              title: "Smart Overlays",
              body: "Stack branded frames and effects using canvas templates.",
            },
            {
              title: "Realtime Insights",
              body: "Measure engagement with charts and Supabase analytics.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="flex flex-col gap-3 px-5 py-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
