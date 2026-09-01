import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { Check, Minus, Sparkles } from "lucide-react";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { Reveal } from "@/components/quesole/motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/quesole/seed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Quesole queue management plans" },
      {
        name: "description",
        content:
          "Starter, Growth and Enterprise plans for Quesole: QR walk-in queues, multi-desk routing, display boards and remote appointments. Compare every feature.",
      },
      { property: "og:title", content: "Quesole pricing — plans that scale with branch count" },
      {
        property: "og:description",
        content:
          "Compare Starter, Growth and Enterprise queue management plans feature by feature.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

/* Full (non-condensed) feature lists per plan. */
const FULL_FEATURES: Record<string, string[]> = {
  starter: [
    "QR walk-in queue (Method 1)",
    "1 branch · 3 desks",
    "Live customer token tracking page",
    "Printable QR signage generator",
    "Basic kiosk mode",
    "Daily operations report",
    "CSV export",
    "Email support (next business day)",
  ],
  growth: [
    "Everything in Starter",
    "Service-based multi-desk routing (Method 2)",
    "Now Serving display boards (Method 3)",
    "8 branches · 40 desks",
    "Alert rules builder + notification centre",
    "Branch comparison analytics & peak-hour heatmap",
    "Staff performance reporting",
    "Company branding (logo + accent colour)",
    "Priority support (4h response)",
  ],
  enterprise: [
    "Everything in Growth",
    "Remote appointment booking with OTP (Method 4)",
    "Unlimited branches & desks",
    "Multi-branch command centre view",
    "Custom SLA thresholds & escalation matrix",
    "White-label subdomain & full branding",
    "Platform-wide audit log export",
    "SSO / directory sync (on request)",
    "Dedicated success manager",
  ],
};

type Cell = boolean | string;
const COMPARISON: Array<{ group: string; rows: Array<{ label: string; cells: [Cell, Cell, Cell] }> }> = [
  {
    group: "Queuing methods",
    rows: [
      { label: "QR walk-in queue", cells: [true, true, true] },
      { label: "Multi-desk service routing", cells: [false, true, true] },
      { label: "Now Serving display board", cells: [false, true, true] },
      { label: "Remote appointments + OTP", cells: [false, false, true] },
    ],
  },
  {
    group: "Scale",
    rows: [
      { label: "Branches", cells: ["1", "8", "Unlimited"] },
      { label: "Desks", cells: ["3", "40", "Unlimited"] },
      { label: "Staff accounts", cells: ["5", "60", "Unlimited"] },
      { label: "Tokens per month", cells: ["Unlimited", "Unlimited", "Unlimited"] },
    ],
  },
  {
    group: "Operations",
    rows: [
      { label: "Operator console", cells: [true, true, true] },
      { label: "Kiosk mode", cells: [true, true, true] },
      { label: "Alert rules builder", cells: [false, true, true] },
      { label: "Command centre map", cells: [false, false, true] },
    ],
  },
  {
    group: "Insight & brand",
    rows: [
      { label: "Daily report", cells: [true, true, true] },
      { label: "Peak-hour heatmap", cells: [false, true, true] },
      { label: "Staff performance", cells: [false, true, true] },
      { label: "White-label branding", cells: [false, "Accent only", true] },
      { label: "Support", cells: ["Email", "Priority", "Dedicated CSM"] },
    ],
  },
];

const FAQ = [
  {
    q: "Can I change plans later?",
    a: "Yes. Raise an upgrade request from Billing; your platform administrator approves it and the new limits apply immediately — no re-onboarding, no downtime for live queues.",
  },
  {
    q: "Is there a setup fee?",
    a: "No. Every plan includes guided onboarding, QR signage templates and branch configuration. You only pay the subscription.",
  },
  {
    q: "What counts as a branch?",
    a: "One physical location with its own queue, desks and display board. Multiple counters inside one location are desks, not branches.",
  },
  {
    q: "Do I pay per customer served?",
    a: "No. Pricing is by branches and desks. Tokens, appointments and customer notifications are unlimited on every tier.",
  },
  {
    q: "Can different branches use different queuing methods?",
    a: "Yes. Each branch is configured independently — a two-counter city office can run the simple QR queue while your flagship runs service routing with a display board.",
  },
  {
    q: "What happens if we exceed our branch or desk limit?",
    a: "Nothing breaks. The console flags the overage, prompts an upgrade and keeps serving existing queues until the request is approved.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes — switch the toggle above. Annual billing saves roughly two months compared with paying monthly.",
  },
  {
    q: "Is this demo using real data?",
    a: "No. This environment runs on a realistic simulated dataset so you can experience every role end to end before connecting live operations.",
  },
];

function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="pt-24">
        {/* Header + toggle */}
        <section className="bg-pearl">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 text-center lg:px-8 lg:py-20">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Pricing
              </span>
              <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
                Plans that scale with your branch count.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Every plan includes unlimited tokens, the operator console and the live customer
                tracking page. You only pay for the locations and counters you actually run.
              </p>

              <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
                {[
                  { id: false, label: "Monthly" },
                  { id: true, label: "Annual · save ~17%" },
                ].map((o) => (
                  <button
                    key={String(o.id)}
                    onClick={() => setAnnual(o.id)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      annual === o.id
                        ? "bg-brand text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Plan cards */}
        <section className="bg-pearl">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 pb-16 lg:grid-cols-3 lg:items-start lg:px-8 lg:pb-24">
            {PLANS.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06} className={cn(p.recommended && "lg:-mt-6")}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-3xl border p-7",
                    p.recommended
                      ? "border-primary/40 bg-surface shadow-[var(--shadow-glow,0_24px_70px_-30px_rgba(99,91,255,0.55))]"
                      : "border-border bg-surface",
                  )}
                  style={
                    p.recommended
                      ? {
                          backgroundImage:
                            "radial-gradient(120% 60% at 50% 0%, color-mix(in oklab, var(--violet) 10%, transparent), transparent 60%), linear-gradient(var(--surface), var(--surface))",
                        }
                      : undefined
                  }
                >
                  {p.recommended ? (
                    <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
                      Recommended
                    </span>
                  ) : null}
                  <h2 className="font-display text-xl font-bold">{p.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                  <div className="mt-5 flex items-end gap-1">
                    <span className="font-display text-4xl font-bold tabular-nums">
                      ₹{(annual ? p.annual : p.monthly).toLocaleString("en-IN")}
                    </span>
                    <span className="pb-1.5 text-sm text-muted-foreground">
                      /{annual ? "year" : "month"}
                    </span>
                  </div>
                  <ul className="mt-6 grid gap-2.5 text-sm">
                    {FULL_FEATURES[p.id]!.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-7 pt-1">
                    <Button
                      asChild
                      size="lg"
                      variant={p.recommended ? "brand" : "outline"}
                      className="w-full"
                    >
                      <Link to="/signup">
                        {p.id === "enterprise" ? "Talk to sales" : "Start free trial"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Comparison table */}
        <section className="bg-ice-tint">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
            <Reveal className="mb-8 max-w-2xl">
              <h2 className="text-3xl font-bold sm:text-4xl">Compare every line item.</h2>
              <p className="mt-3 text-muted-foreground">
                The full feature matrix, so procurement never has to ask a follow-up question.
              </p>
            </Reveal>
            <Reveal>
              <div className="overflow-x-auto rounded-3xl border border-border bg-surface">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Feature
                      </th>
                      {PLANS.map((p) => (
                        <th key={p.id} className="px-5 py-4 text-center font-display text-base font-bold">
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((g) => (
                      <Fragment key={g.group}>
                        <tr className="bg-accent/40">
                          <td
                            colSpan={4}
                            className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary"
                          >
                            {g.group}
                          </td>
                        </tr>
                        {g.rows.map((r) => (
                          <tr key={r.label} className="border-b border-border/60 last:border-0">
                            <td className="px-5 py-3.5 text-muted-foreground">{r.label}</td>
                            {r.cells.map((c, idx) => (
                              <td key={idx} className="px-5 py-3.5 text-center">
                                {typeof c === "string" ? (
                                  <span className="font-medium">{c}</span>
                                ) : c ? (
                                  <Check className="mx-auto h-4 w-4 text-emerald" />
                                ) : (
                                  <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-pearl">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[38fr_62fr] lg:px-8 lg:py-24">
            <Reveal>
              <h2 className="text-3xl font-bold sm:text-4xl">Everything else you're wondering.</h2>
              <p className="mt-3 text-muted-foreground">
                Still stuck? The live demo answers most of it faster than a sales call.
              </p>
              <Button asChild variant="outline" size="lg" className="mt-6">
                <Link to="/app">Open the live demo</Link>
              </Button>
            </Reveal>
            <Reveal>
              <div className="rounded-3xl border border-border bg-surface px-6 py-2">
                <Accordion type="single" collapsible>
                  {FAQ.map((f) => (
                    <AccordionItem key={f.q} value={f.q}>
                      <AccordionTrigger className="text-left text-base font-semibold">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Final CTA band */}
        <section className="mx-auto w-full max-w-7xl px-5 pb-20 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-brand px-8 py-14 text-center text-primary-foreground">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Still deciding?</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm opacity-90 sm:text-base">
                Start a free 14-day trial on any plan. Configure a branch, print a QR code and watch
                your first token move in under five minutes.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" variant="coral">
                  <Link to="/signup">Start your free trial</Link>
                </Button>
                <Button asChild size="lg" variant="glass">
                  <Link to="/app">Book a demo walkthrough</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
