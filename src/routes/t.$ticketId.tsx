import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, MapPin, Timer, Users, Loader2 } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { useQuesole, positionOf } from "@/lib/quesole/store";
import { CountUp, FlipNumber, motion } from "@/components/quesole/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/t/$ticketId")({
  head: () => ({
    meta: [
      { title: "Your live token — Quesole" },
      {
        name: "description",
        content: "Track your position in line and estimated wait time live, without refreshing.",
      },
      { property: "og:title", content: "Your live queue token" },
      { property: "og:description", content: "See your position and estimated wait in real time." },
    ],
  }),
  component: TokenPage,
});

function TokenPage() {
  const { ticketId } = Route.useParams();
  const { state } = useQuesole();
  const storeInfo = positionOf(state, ticketId);
  const [remoteInfo, setRemoteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(!storeInfo);

  useEffect(() => {
    if (storeInfo) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchTicket = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/public/ticket/${ticketId}/`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setRemoteInfo(data);
          }
        }
      } catch (e) {
        console.error("Failed to fetch public ticket:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTicket();
    const interval = setInterval(fetchTicket, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [ticketId, storeInfo]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-medium text-muted-foreground">Loading token details…</p>
        </div>
      </div>
    );
  }

  const info = storeInfo || (remoteInfo ? {
    ticket: {
      id: remoteInfo.id,
      branchId: remoteInfo.branchId,
      serviceId: remoteInfo.serviceId,
      deskId: remoteInfo.deskId,
      number: remoteInfo.number,
      customerName: remoteInfo.customerName,
      contact: remoteInfo.contact,
      note: remoteInfo.note,
      status: remoteInfo.status,
      joinedAt: remoteInfo.joinedAt
    },
    ahead: remoteInfo.ahead,
    eta: remoteInfo.eta,
    service: { name: remoteInfo.serviceName, avgMinutes: 15 }
  } : null);

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div>
          <h1 className="text-2xl font-bold">Token not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This token has expired or the demo data was reset.
          </p>
          <Button asChild variant="brand" className="mt-5">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { ticket, ahead, eta, service } = info;
  const branch = state.branches.find((b) => String(b.id) === String(ticket.branchId)) || { name: remoteInfo?.branchName || "Branch" };
  const desk = state.desks.find((d) => String(d.id) === String(ticket.deskId)) || (remoteInfo?.deskLabel ? { label: remoteInfo.deskLabel } : null);
  const isNow = ticket.status === "serving" || ticket.status === "called";
  const isDone = ticket.status === "served";
  const progress = isDone ? 100 : isNow ? 92 : Math.max(8, 92 - ahead * 12);

  return (
    <div className="ambient min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-lg">
        <Link to="/" className="mb-6 inline-flex items-center gap-2.5">
          <Logo size={32} />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel overflow-hidden text-center"
        >
          <div
            className={cn(
              "px-6 py-9 text-primary-foreground transition-colors duration-700",
              isNow ? "bg-coral" : isDone ? "bg-emerald" : "bg-brand",
            )}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-85">
              {isDone ? "Completed" : isNow ? "It's your turn" : "Your token"}
            </div>
            <div className="mt-1 font-display text-7xl font-bold">
              <FlipNumber value={ticket.number} />
            </div>
            <div className="mt-2 text-sm opacity-90">
              {service?.name} · {branch?.name}
            </div>
          </div>

          <div className="grid gap-5 p-6">
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full bg-brand"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>Joined</span>
                <span>Called</span>
                <span>Served</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Stat icon={Users} label="Ahead of you" value={<CountUp value={ahead} />} />
              <Stat icon={Timer} label="Est. wait" value={<CountUp value={eta} suffix="m" />} />
              <Stat
                icon={MapPin}
                label="Counter"
                value={desk ? desk.label.replace("Counter ", "") : "—"}
              />
            </div>

            {isNow ? (
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-coral/12 px-4 py-4 text-sm font-semibold text-coral"
              >
                <CheckCircle2 className="h-4 w-4" /> Please proceed to {desk?.label ?? "the counter"}
              </motion.div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keep this page open — your position updates automatically. We'll highlight the screen
                when it's your turn.
              </p>
            )}

            <div className="rounded-2xl bg-accent/40 px-4 py-3 text-left text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">{ticket.customerName}</div>
              {ticket.contact} {ticket.note ? `· ${ticket.note}` : ""}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-accent/50 px-3 py-3.5">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <div className="mt-1.5 font-display text-xl font-bold">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
