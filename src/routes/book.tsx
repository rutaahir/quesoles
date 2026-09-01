import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuesole } from "@/lib/quesole/store";
import { motion, Reveal } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a remote appointment — Quesole" },
      {
        name: "description",
        content:
          "Reserve a time slot at any Quesole branch, get a confirmation code and skip the walk-in line.",
      },
      { property: "og:title", content: "Book an appointment on Quesole" },
      {
        property: "og:description",
        content: "Pick a branch, service, date and slot — arrive at your reserved time.",
      },
    ],
  }),
  component: BookPage,
});

const SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
];

function nextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

function BookPage() {
  const { state, actions } = useQuesole();
  const branches = state.branches;
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const services = state.services.filter((s) => s.branchId === branchId);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const days = useMemo(() => nextDays(7), []);
  const [date, setDate] = useState(days[0]!.toISOString().slice(0, 10));
  const [slot, setSlot] = useState("10:00");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const selectedBranch = state.branches.find((b) => b.id === branchId);
  const company = selectedBranch ? state.companies.find((c) => c.id === selectedBranch.companyId) : undefined;
  const noServiceMode = Boolean(
    company &&
    state.companyAllocations.find(
      (a) => String(a.companyId) === String(company.id) && a.component_key === "services"
    )?.purchased_qty === 0
  );

  const taken = new Set(
    state.appointments
      .filter((a) => a.branchId === branchId && a.date === date && a.status === "confirmed")
      .map((a) => a.slot),
  );

  const activeService = services.find((s) => s.id === serviceId) ?? services[0];
  const valid = branchId && (noServiceMode || activeService) && name.trim().length > 1 && contact.trim().length > 5;

  async function book() {
    if (!noServiceMode && !activeService) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1000));
    const c = await actions.bookAppointment({
      branchId,
      serviceId: noServiceMode ? "" : activeService!.id,
      customerName: name,
      contact,
      date,
      slot,
    });
    setBusy(false);
    setCode(c);
    toast.success("Appointment confirmed", { description: `Reference ${c}` });
  }

  const booked = code ? state.appointments.find((a) => a.code === code) : undefined;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="ambient mx-auto max-w-4xl px-5 pb-20 pt-28 lg:pt-32">
        {booked && booked.status === "confirmed" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="panel mx-auto max-w-lg p-9 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald/15 text-emerald">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">You're booked</h1>
            <div className="mt-4 rounded-2xl bg-accent/50 px-5 py-4 text-left text-sm">
              <Row k="Reference" v={booked.code} />
              <Row k="Branch" v={state.branches.find((b) => b.id === booked.branchId)?.name ?? ""} />
              <Row
                k="Service"
                v={state.services.find((s) => s.id === booked.serviceId)?.name ?? ""}
              />
              <Row k="When" v={`${booked.date} at ${booked.slot}`} />
              <Row k="Name" v={booked.customerName} />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  actions.cancelAppointment(booked.code);
                  toast("Appointment cancelled");
                  setCode(null);
                }}
              >
                <X className="h-4 w-4" /> Cancel booking
              </Button>
              <Button asChild variant="brand">
                <Link to="/">Done</Link>
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                <CalendarCheck className="h-3.5 w-3.5" /> Method 4 · Remote appointments
              </span>
              <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Reserve your slot.</h1>
              <p className="mt-2 text-muted-foreground">
                Pick a branch and a time. Your token is generated automatically when you arrive.
              </p>
            </Reveal>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
              <div className="panel grid gap-6 p-6">
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Branch
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setBranchId(b.id);
                          const first = state.services.find((s) => s.branchId === b.id);
                          setServiceId(first?.id ?? "");
                        }}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all",
                          branchId === b.id
                            ? "border-primary bg-accent/50"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="text-sm font-semibold">{b.name}</div>
                        <div className="text-[11px] text-muted-foreground">{b.city}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Service
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setServiceId(s.id)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm transition-all",
                          activeService?.id === s.id
                            ? "border-primary bg-brand text-primary-foreground"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Date
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {days.map((d) => {
                      const iso = d.toISOString().slice(0, 10);
                      return (
                        <button
                          key={iso}
                          onClick={() => setDate(iso)}
                          className={cn(
                            "min-w-16 shrink-0 rounded-xl border px-3 py-2 text-center transition-all",
                            date === iso
                              ? "border-primary bg-accent/60"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {d.toLocaleDateString("en-IN", { weekday: "short" })}
                          </div>
                          <div className="font-display text-lg font-bold">{d.getDate()}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Slot
                  </Label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {SLOTS.map((s) => {
                      const full = taken.has(s);
                      return (
                        <button
                          key={s}
                          disabled={full}
                          onClick={() => setSlot(s)}
                          className={cn(
                            "rounded-xl border px-2 py-2.5 text-sm font-medium transition-all",
                            full
                              ? "cursor-not-allowed border-dashed border-border text-muted-foreground/50"
                              : slot === s
                                ? "border-primary bg-brand text-primary-foreground"
                                : "border-border hover:border-primary/40",
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="panel h-fit grid gap-4 p-6">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Full name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aarav Shah"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Mobile
                  </Label>
                  <Input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+91 98250 00000"
                    className="h-11 rounded-xl"
                    inputMode="tel"
                  />
                </div>
                <div className="rounded-2xl bg-accent/50 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4 text-primary" />
                    {date} · {slot}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {activeService?.name} · approx {activeService?.avgMinutes ?? 10} min
                  </div>
                </div>
                <Button size="lg" variant="brand" disabled={!valid || busy} onClick={book}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm appointment
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
