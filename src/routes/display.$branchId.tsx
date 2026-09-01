import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";
import type { Desk, Ticket, Service } from "@/lib/quesole/types";

export const Route = createFileRoute("/display/$branchId")({
  head: () => ({
    meta: [
      { title: "Live Display Board — Now Serving" },
      { name: "description", content: "Live now-serving and up-next token board for branch waiting area." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Live Queue Display Board" },
    ],
  }),
  component: DisplayBoard,
});

/* ─── CONSTANTS ─────────────────────────────────────────────── */
const MAX_DESKS_PER_PAGE = 8;
const PAGE_ROTATE_MS    = 8_000;
const NEXT_PER_DESK     = 3;

/* ─── CLOCK ─────────────────────────────────────────────────── */
function useLiveClock() {
  const [clock, setClock] = useState("");
  const [date,  setDate]  = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDate(now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return { clock, date };
}

function usePrevious<T>(val: T) {
  const ref = useRef<T>(val);
  useEffect(() => { ref.current = val; });
  return ref.current;
}

/* ─── DESK LIVE-STATE ──────────────────────────────────────── */
type DeskLiveState = "serving" | "ready" | "closed";

function getDeskLiveState(desk: Desk, servingTicket: Ticket | undefined): DeskLiveState {
  if (servingTicket) return "serving";
  // On public display, desk.staffId is returned as user ID string if there is a DeskStaffAssignment
  if (desk.staffId) return "ready";
  return "closed";
}

/* ─── DESK CARD ─────────────────────────────────────────────── */
interface DeskCardProps {
  desk: Desk;
  servingTicket:  Ticket | undefined;
  nextTickets:    Ticket[];
  hasServices:    boolean;
  hasServicesEnabled: boolean;
  serviceName:    (id: string) => string;
}

function DeskCard({ desk, servingTicket, nextTickets, hasServices, hasServicesEnabled, serviceName }: DeskCardProps) {
  const liveState  = getDeskLiveState(desk, servingTicket);
  const isEnabled  = desk.isActive ?? true;
  const prevNumber = usePrevious(servingTicket?.number);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (servingTicket?.number && servingTicket.number !== prevNumber) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [servingTicket?.number, prevNumber]);

  const badge = {
    serving: { label: "Serving",  dot: "bg-emerald-400 animate-pulse", text: "text-emerald-400" },
    ready:   { label: "Ready",    dot: "bg-emerald-400/60",             text: "text-emerald-400/80" },
    closed:  { label: "Closed",   dot: "bg-white/25",                   text: "text-white/40" },
  }[liveState];

  const cardClass = liveState === "serving"
    ? "border-emerald-500/30 bg-indigo-500/[0.08] shadow-lg shadow-emerald-500/5"
    : liveState === "ready"
    ? "border-white/15 bg-white/[0.05]"
    : "border-white/8  bg-white/[0.03]";

  const numClass = servingTicket
    ? "text-white"
    : liveState === "closed"
    ? "text-white/20"
    : "text-white/25";

  return (
    <motion.div
      layout
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl border transition-all duration-500",
        cardClass,
        !isEnabled && "opacity-60"
      )}
    >
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute inset-0 rounded-3xl bg-emerald-400/18 z-10"
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-6 pt-5 pb-1">
        <span className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/70">
          {desk.label || desk.id}
        </span>
        <span className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider", badge.text)}>
          <span className={cn("h-2 w-2 rounded-full", badge.dot)} />
          {badge.label}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/55 mb-2">
          Now Serving
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={servingTicket?.number ?? "idle"}
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -32, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "font-display tabular-nums font-black leading-none text-[clamp(3.5rem,9vw,7.5rem)]",
              numClass
            )}
          >
            {servingTicket?.number ?? "—"}
          </motion.div>
        </AnimatePresence>
        {servingTicket && hasServicesEnabled && (
          <div className="mt-2 text-xs font-semibold text-white/55">
            {serviceName(servingTicket.serviceId)}
          </div>
        )}
        {!servingTicket && liveState === "ready" && (
          <div className="mt-1 text-[11px] text-white/40">Ready for next customer</div>
        )}
        {!servingTicket && liveState === "closed" && (
          <div className="mt-1 text-[11px] text-white/30">No operator on shift</div>
        )}
      </div>

      <div className="px-6 pb-5">
        <div className="border-t border-white/[0.08] pt-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45 mb-2">Next</div>
          {!hasServices ? (
            <p className="text-[11px] text-amber-400/70 font-medium">No services assigned to this desk</p>
          ) : nextTickets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {nextTickets.map((t) => (
                  <motion.span
                    key={t.id}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.22 }}
                    className="rounded-xl bg-white/[0.10] px-3 py-1.5 font-display text-lg font-bold tabular-nums text-white/80"
                  >
                    {t.number}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-[11px] text-white/30">No one waiting</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── METHOD 1 — Single large panel ─────────────────────────── */
function SingleQueuePanel({ tickets, hasServicesEnabled, serviceName }: { tickets: Ticket[]; hasServicesEnabled: boolean; serviceName: (id: string) => string }) {
  const serving = tickets.find((t) => t.status === "serving" || t.status === "called");
  const next    = tickets.filter((t) => t.status === "waiting").sort((a, b) => a.joinedAt - b.joinedAt).slice(0, 5);
  const prevNum = usePrevious(serving?.number);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (serving?.number && serving.number !== prevNum) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [serving?.number, prevNum]);

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center gap-8">
      <AnimatePresence>
        {flash && (
          <motion.div
            key="ring"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="h-96 w-96 rounded-full ring-4 ring-emerald-400/35" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center space-y-2">
        <div className="text-sm font-bold uppercase tracking-[0.4em] text-white/55">Now Serving</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={serving?.number ?? "idle"}
            initial={{ y: 48, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -48, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "font-display font-black tabular-nums leading-none text-[clamp(8rem,22vw,16rem)]",
              serving ? "text-white" : "text-white/20"
            )}
          >
            {serving?.number ?? "—"}
          </motion.div>
        </AnimatePresence>
        {serving && hasServicesEnabled && <div className="text-sm text-white/50">{serviceName(serving.serviceId)}</div>}
      </div>

      {next.length > 0 && (
        <div className="text-center space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Next Up</div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <AnimatePresence initial={false}>
              {next.map((t) => (
                <motion.span
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="rounded-2xl bg-white/[0.10] px-5 py-2.5 font-display text-3xl font-bold tabular-nums text-white/70"
                >
                  {t.number}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN DISPLAY BOARD ─────────────────────────────────────── */
function DisplayBoard() {
  const { branchId } = Route.useParams();
  const { clock, date } = useLiveClock();
  const [page, setPage] = useState(0);

  // Local state to avoid global store authentication triggers
  const [branch, setBranch] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBaseUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL)
    ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
    : (typeof window !== "undefined" ? `http://${window.location.hostname}:8000` : "http://localhost:8000");

  // Function to load privacy-safe public data
  const loadPublicData = async () => {
    try {
      const res = await fetch(`${fetchBaseUrl}/api/public/display/${branchId}/`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Branch not found");
        throw new Error("Failed to load display board details");
      }
      const data = await res.json();
      setBranch(data.branch);
      setCompany(data.company);
      setDesks(data.desks);
      setServices(data.services);
      setTickets(data.tickets);
      setError(null);
    } catch (err: any) {
      console.warn("Public display load failed:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and periodic polling fallback
  useEffect(() => {
    loadPublicData();
    const intervalId = setInterval(loadPublicData, 20000); // 20s poll fallback
    return () => clearInterval(intervalId);
  }, [branchId]);

  // WebSocket Live Updates Gating (Public PII-Free connection)
  useEffect(() => {
    const wsHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const wsUrl = `ws://${wsHost}:8000/ws/branch/${branchId}/public/`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = jsonParse(event.data);
        if (payload && payload.type === "queue.update" && payload.data) {
          const t = payload.data;
          
          // Strip PII client-side if any somehow leaked to this channel
          const mapped: Ticket = {
            id: String(t.id),
            branchId: String(t.branch),
            serviceId: t.service ? String(t.service) : "",
            deskId: t.desk ? String(t.desk) : null,
            predictedDeskId: t.predicted_desk ? String(t.predicted_desk) : null,
            number: t.token_number,
            status: t.status,
            customerName: "Guest",
            contact: "",
            joinedAt: new Date(t.created_at).getTime(),
            calledAt: t.called_at ? new Date(t.called_at).getTime() : undefined,
            servedAt: t.served_at ? new Date(t.served_at).getTime() : undefined
          };

          setTickets((prev) => {
            // Remove ticket if it's served/cancelled/skipped
            const removeStatuses = ["served", "cancelled", "skipped", "no_show"];
            if (removeStatuses.includes(mapped.status)) {
              return prev.filter((x) => x.id !== mapped.id);
            }
            const exists = prev.some((x) => x.id === mapped.id);
            if (exists) {
              return prev.map((x) => (x.id === mapped.id ? mapped : x));
            } else {
              return [...prev, mapped].sort((a, b) => a.joinedAt - b.joinedAt);
            }
          });
        }
      } catch (err) {
        console.error("Error processing websocket message:", err);
      }
    };

    return () => ws.close();
  }, [branchId]);

  const method = branch?.method ?? 1;
  const enabledMethods = branch?.enabledMethods ?? [method];
  const hasWalkIn = enabledMethods.some((m: number) => m === 1 || m === 2 || m === 3);

  // Pagination calculations
  const totalPages = Math.ceil(desks.length / MAX_DESKS_PER_PAGE);
  const visibleDesks = totalPages > 1
    ? desks.slice(page * MAX_DESKS_PER_PAGE, (page + 1) * MAX_DESKS_PER_PAGE)
    : desks;

  useEffect(() => {
    if (totalPages <= 1) return undefined;
    const id = setInterval(() => setPage((p) => (p + 1) % totalPages), PAGE_ROTATE_MS);
    return () => clearInterval(id);
  }, [totalPages]);

  const servingForDesk = (desk: Desk): Ticket | undefined =>
    tickets
      .filter((t) => String(t.deskId) === String(desk.id) && (t.status === "serving" || t.status === "called"))
      .sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0))[0];

  const nextForDesk = (desk: Desk): { tickets: Ticket[]; hasServices: boolean } => {
    const deskServiceIds = new Set(desk.serviceIds || []);
    const nextTickets = tickets
      .filter((t) => t.status === "waiting" && t.predictedDeskId && String(t.predictedDeskId) === String(desk.id))
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .slice(0, NEXT_PER_DESK);
    return {
      tickets: nextTickets,
      hasServices: deskServiceIds.size > 0,
    };
  };

  const serviceName = (id: string) =>
    services.find((s) => String(s.id) === String(id))?.name ?? "";

  const deskCount = visibleDesks.length;
  const gridCols =
    deskCount === 1 ? "grid-cols-1 max-w-sm mx-auto" :
    deskCount === 2 ? "grid-cols-2" :
    deskCount <= 4  ? "grid-cols-2 lg:grid-cols-4" :
    deskCount <= 6  ? "grid-cols-2 lg:grid-cols-3" :
    "grid-cols-2 lg:grid-cols-4";

  const brandPrimary = company?.brandColors?.primary ?? "#6366F1";
  const waitingTickets = tickets.filter((t) => t.status === "waiting");

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white bg-[#0d0e1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <p className="text-sm font-medium text-white/40">Loading display board…</p>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error && !branch) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center px-8 gap-4 text-white bg-[#0d0e1a]">
        <div className="text-5xl opacity-40">⚠️</div>
        <h1 className="font-display text-2xl font-bold">Failed to Load Display</h1>
        <p className="text-sm text-white/40 max-w-md">{error}</p>
        <button onClick={loadPublicData} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-xl transition-all">
          Retry Connection
        </button>
      </div>
    );
  }

  if (!branch) throw notFound();

  /* ── Method 4-only: no walk-in queue ── */
  if (!hasWalkIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center px-8 gap-6 text-white bg-[#0d0e1a]">
        <div className="text-6xl">📋</div>
        <h1 className="font-display text-3xl font-bold">{branch.name}</h1>
        <p className="text-base text-white/45 max-w-md">
          This branch operates by appointment only — there is no walk-in queue display for this location.
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col text-white overflow-hidden"
      style={{
        background: `linear-gradient(160deg, #0d0e1a 0%, #0f1028 55%, #111238 100%)`,
        fontFamily: "'Inter', 'Outfit', sans-serif",
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-25"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 15% 0%, ${brandPrimary}55 0%, transparent 70%)`,
        }}
      />

      {/* ── HEADER ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt={company.name ?? ""} className="h-9 w-9 object-contain rounded-xl shrink-0" />
          ) : (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm text-white shadow-lg"
              style={{ background: brandPrimary }}
            >
              {company?.name?.[0] ?? "Q"}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-sm text-white truncate">{company?.name}</div>
            <div className="text-[11px] text-white/50 truncate">{branch.name} · {branch.city}</div>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn("h-1.5 rounded-full transition-all", i === page ? "w-6 bg-white/70" : "w-1.5 bg-white/25")}
              />
            ))}
          </div>
        )}

        <div className="text-right shrink-0">
          <div className="font-display text-2xl font-bold tabular-nums tracking-wide">{clock}</div>
          <div className="text-[11px] text-white/40">{date}</div>
        </div>
      </header>

      {/* ── MAIN AREA ── */}
      {(() => {
        const hasServicesEnabled = company?.has_services_enabled ?? true;
        return (
          <main className="relative z-10 flex-1 flex flex-col px-6 py-6 gap-6 min-h-0">
            {(desks.length === 0 && method === 1 && !enabledMethods.some((m: number) => m === 2 || m === 3)) ? (
              <SingleQueuePanel tickets={tickets} hasServicesEnabled={hasServicesEnabled} serviceName={serviceName} />
            ) : (
              <>
                {desks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                    <div className="text-5xl opacity-30">🖥️</div>
                    <p className="text-base text-white/35">No desks configured for this branch yet.</p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`page-${page}`}
                      initial={{ opacity: 0, x: 28 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -28 }}
                      transition={{ duration: 0.4 }}
                      className={cn("grid gap-4 flex-1 content-start", gridCols)}
                    >
                      {visibleDesks.map((desk) => {
                        const st = servingForDesk(desk);
                        const { tickets: nxt, hasServices } = nextForDesk(desk);
                        return (
                          <DeskCard
                            key={desk.id}
                            desk={desk}
                            servingTicket={st}
                            nextTickets={nxt}
                            hasServices={hasServicesEnabled ? hasServices : true}
                            hasServicesEnabled={hasServicesEnabled}
                            serviceName={serviceName}
                          />
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                )}
              </>
            )}

            {hasWalkIn && desks.length > 0 && (
              <div className="shrink-0 flex items-center justify-center gap-6 py-2 border-t border-white/[0.07] text-xs text-white/35 font-medium">
                <span>
                  <span className="text-white/65 font-bold tabular-nums">{waitingTickets.length}</span> waiting in queue
                </span>
                {branch.openHours && (
                  <span>Open <span className="text-white/55">{branch.openHours}</span></span>
                )}
              </div>
            )}
          </main>
        );
      })()}

      {/* ── TICKER ── */}
      <footer className="relative z-10 shrink-0 border-t border-white/[0.07] bg-white/[0.02] overflow-hidden py-2.5">
        <motion.div
          className="whitespace-nowrap text-xs text-white/30 font-medium px-4"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          Please keep your token slip visible · Missed your number? Speak to our staff · Powered by Quesole &nbsp;&nbsp;&nbsp;&nbsp;
          Please keep your token slip visible · Missed your number? Speak to our staff · Powered by Quesole
        </motion.div>
      </footer>
    </div>
  );
}

function jsonParse(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
