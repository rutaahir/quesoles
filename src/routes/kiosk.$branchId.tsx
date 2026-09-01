import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, LogOut, Printer, Settings, Sparkles, Ticket as TicketIcon, Touchpad, Sun, Moon, ShieldCheck, Wifi, Headset, ArrowRight, User, Phone, Mail, MessageSquare, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useQuesole, waitingOf, apiFetch } from "@/lib/quesole/store";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket } from "@/lib/quesole/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kiosk/$branchId")({
  validateSearch: (search: Record<string, unknown>): { method?: string | undefined } => {
    return {
      method: search["method"] as string | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Self-service kiosk — Walk-in Touch Check-In" },
      {
        name: "description",
        content: "Touch-friendly self-service kiosk for walk-in visitors to pick a service and get a printed token.",
      },
    ],
  }),
  component: Kiosk,
});

type KioskState = "idle" | "form" | "confirmation";

function Kiosk() {
  const { branchId } = Route.useParams();
  const { method: methodQuery } = Route.useSearch();
  const isKotDirect = methodQuery === "kot";
  const navigate = useNavigate();
  const { state, actions } = useQuesole();

  const branch = state.branches.find((b) => String(b.id) === String(branchId) || b.slug === branchId);
  const company = state.companies.find((c) => String(c.id) === String(branch?.companyId));
  const services = state.services.filter((s) => String(s.branchId) === String(branch?.id ?? branchId) && s.isActive !== false);

  // 4-State UI State Machine
  const [kioskState, setKioskState] = useState<KioskState>(isKotDirect ? "form" : "idle");
  const [isStaffLockOpen, setIsStaffLockOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // Kiosk Initial Unlock State
  const [initPin, setInitPin] = useState("");
  const [initPinError, setInitPinError] = useState<string | null>(null);
  const [isDeviceUnlocked, setIsDeviceUnlocked] = useState(false);
  const [kiosksList, setKiosksList] = useState<any[]>([]);
  const [selectedKioskId, setSelectedKioskId] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isEvicted, setIsEvicted] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation / Issued Ticket State
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [printFailed, setPrintFailed] = useState(false);

  // Delivery Channel state
  const [deliveryChannel, setDeliveryChannel] = useState<"sms" | "whatsapp" | "kiosk">("kiosk");

  // Determine active methods for this branch
  const enabledMethods = (branch?.enabledMethods || []).map(Number);
  const hasKioskPrinted = enabledMethods.includes(2) && !isKotDirect;
  const hasSms = enabledMethods.includes(3);
  const hasWhatsapp = enabledMethods.includes(4);

  // Set default delivery channel when branch loaded or changed
  useEffect(() => {
    if (isKotDirect) {
      // KOT Direct link: lock to SMS, or WhatsApp if SMS not enabled
      if (hasSms) {
        setDeliveryChannel("sms");
      } else if (hasWhatsapp) {
        setDeliveryChannel("whatsapp");
      }
    } else if (hasKioskPrinted) {
      setDeliveryChannel("kiosk");
    } else if (hasSms) {
      setDeliveryChannel("sms");
    } else if (hasWhatsapp) {
      setDeliveryChannel("whatsapp");
    } else {
      setDeliveryChannel("kiosk");
    }
  }, [isKotDirect, hasKioskPrinted, hasSms, hasWhatsapp]);

  // When isKotDirect resolves (TanStack Router search params settle after mount),
  // upgrade idle → form so the attract screen is never shown on the KOT direct link.
  useEffect(() => {
    if (isKotDirect && kioskState === "idle") {
      setKioskState("form");
    }
  }, [isKotDirect, kioskState]);

  // Auto-select first service if available
  useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0]?.id ?? "");
    }
  }, [services, selectedServiceId]);

  // Load Kiosks List for the Branch
  useEffect(() => {
    if (!branch?.id) return;
    apiFetch(`/api/public/kiosks/?branch_id=${branch.id}`)
      .then((data: any) => {
        setKiosksList(data);
        if (data.length > 0) {
          setSelectedKioskId(data[0].id);
        }
      })
      .catch((err: any) => console.error("Failed to load kiosks:", err));
  }, [branch?.id]);

  // WebSocket Live Session Connection & Heartbeat
  useEffect(() => {
    if (!isDeviceUnlocked || !selectedKioskId || !sessionToken || !branch?.id) return;

    const wsUrl = `ws://${window.location.hostname}:8000/ws/queue/${branch.id}/public/?kiosk_id=${selectedKioskId}&session_token=${sessionToken}`;
    const ws = new WebSocket(wsUrl);

    let heartbeatTimer: NodeJS.Timeout;

    ws.onopen = () => {
      console.log("Kiosk WebSocket connected");
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, 15000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "force_logout") {
          setIsEvicted(true);
          setIsDeviceUnlocked(false);
          setSessionToken(null);
          toast.error("This kiosk session was evicted (another login or pin reset).");
        }
      } catch (err) {
        console.error("Failed to parse websocket message:", err);
      }
    };

    ws.onclose = (event) => {
      console.log("Kiosk WebSocket closed", event.code);
      if (event.code === 4003) {
        setIsDeviceUnlocked(false);
        setSessionToken(null);
      }
    };

    return () => {
      clearInterval(heartbeatTimer);
      ws.close();
    };
  }, [isDeviceUnlocked, selectedKioskId, sessionToken, branch?.id]);

  // State 3: Auto-print on entering Confirmation state
  useEffect(() => {
    if (kioskState !== "confirmation" || !createdTicket) return;
    const isDigital = createdTicket.method === "3" || createdTicket.method === "4" || createdTicket.method === 3 || createdTicket.method === 4;
    if (isDigital) return;

    // Auto-trigger browser print dialog for thermal receipt printer
    const timer = setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn("Print trigger failed:", err);
        setPrintFailed(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [kioskState, createdTicket]);

  // State 3: Auto-reset to Idle state after idle timeout
  useEffect(() => {
    if (kioskState !== "confirmation") return;
    const timeoutSec = branch?.kioskIdleTimeoutSeconds || 8;
    const timer = setTimeout(() => {
      resetToIdle();
    }, timeoutSec * 1000);

    return () => clearTimeout(timer);
  }, [kioskState, branch?.kioskIdleTimeoutSeconds]);

  if (state.branches.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Loading kiosk system…</p>
        </div>
      </div>
    );
  }

  if (!branch) throw notFound();

  const showLockScreen = !isDeviceUnlocked;
  const pinLength = 4;

  const isServiceMode = branch?.mode === "SERVICE_BASED";

  const resetToIdle = () => {
    setKioskState(isKotDirect ? "form" : "idle");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setMessage("");
    setFormError(null);
    setCreatedTicket(null);
    setPrintFailed(false);
  };

  // Submit Customer Check-In Form
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 6) {
      setFormError("Please enter a valid mobile number.");
      return;
    }
    if (customerEmail.trim() && !customerEmail.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (isServiceMode && services.length > 0 && !selectedServiceId) {
      setFormError("Please select a service category.");
      return;
    }

    setIsSubmitting(true);
    try {
      const emailTrimmed = customerEmail.trim();
      const noteTrimmed = message.trim();
      const ticketId = await actions.joinQueue({
        branchId: branch.id,
        serviceId: isServiceMode ? (selectedServiceId || services[0]?.id || "") : "",
        customerName: customerName.trim(),
        contact: customerPhone.trim(),
        channel: deliveryChannel,
        ...(emailTrimmed ? { customerEmail: emailTrimmed } : {}),
        ...(noteTrimmed ? { note: noteTrimmed } : {}),
      });

      // Retrieve created ticket details
      const newTicket = state.tickets.find((t) => String(t.id) === String(ticketId)) || {
        id: ticketId || `kiosk-${Date.now()}`,
        branchId: branch.id,
        serviceId: isServiceMode ? selectedServiceId : "",
        deskId: null,
        number: !isServiceMode
          ? String(state.tickets.length + 1).padStart(3, "0")
          : `${services.find((s) => s.id === selectedServiceId)?.prefix || "A"}${String(state.tickets.length + 1).padStart(3, "0")}`,
        customerName: customerName.trim(),
        contact: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        channel: deliveryChannel,
        note: message.trim() || undefined,
        status: "waiting",
        joinedAt: Date.now(),
      };

      setCreatedTicket(newTicket as Ticket);
      setKioskState("confirmation");
    } catch (err: any) {
      setFormError(err.message || "Failed to create ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Staff Exit PIN Gate Validation
  const handleStaffUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (!branch?.id) return;

    try {
      const res = await apiFetch(`/api/branches/${branch.id}/verify-kiosk-password/`, {
        method: "POST",
        body: JSON.stringify({ password: enteredPin })
      });
      if (res.verified) {
        toast.success("Kiosk unlocked — Returning to Branch Console");
        setIsStaffLockOpen(false);
        void navigate({ to: "/app" });
      } else {
        setPinError(res.error || "Incorrect password. Please try again.");
        setEnteredPin("");
      }
    } catch (err: any) {
      setPinError(err.message || "Incorrect password or exit is locked.");
      setEnteredPin("");
    }
  };

  const isKotEnabledForBranch = hasSms || hasWhatsapp;

  if (isKotDirect && !isKotEnabledForBranch) {
    return (
      <div className="relative flex min-h-screen flex-col bg-background text-foreground select-none overflow-hidden font-sans">
        <KioskBackground 
          customerName=""
          selectedServiceName=""
          servicePrefix=""
          waitingCount={0}
        />
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-[480px] p-10 md:p-12 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.15)] rounded-[2.5rem] space-y-6 border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 shadow-lg">
                <AlertCircle className="h-8 w-8" />
              </div>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">KOT Delivery Disabled</h2>
            <p className="text-sm font-semibold text-muted-foreground/80 leading-relaxed">
              KOT delivery (SMS / WhatsApp notification) is not currently enabled for this branch. Please contact the administrator.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const selectedServiceObj = services.find((s) => s.id === selectedServiceId);
  const waitingCount = waitingOf(state, branch.id).length;

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground select-none overflow-hidden font-sans">
      <KioskBackground 
        customerName={customerName}
        selectedServiceName={selectedServiceObj?.name || ""}
        servicePrefix={selectedServiceObj?.prefix || ""}
        waitingCount={waitingCount}
      />

      {/* Printable Thermal Receipt (Hidden on screen, target for @media print 80mm roll paper) */}
      <div className="hidden print:block font-mono text-black p-2 max-w-[80mm] mx-auto text-center space-y-2">
        <style font-mono>{`
          @media print {
            body * { visibility: hidden; }
            #printable-receipt, #printable-receipt * { visibility: visible; }
            #printable-receipt { position: absolute; left: 0; top: 0; width: 80mm; padding: 10px; font-family: monospace; }
          }
        `}</style>

        <div id="printable-receipt" className="text-center space-y-1.5 text-xs">
          <div className="font-bold text-sm uppercase tracking-tight">{company?.name || "QUEUESOL QUEUE"}</div>
          <div className="font-bold text-xs uppercase">{branch.name}</div>
          <div className="text-[10px] text-gray-600">{branch.address || branch.city}</div>
          <div className="border-b border-black my-1" />

          <div className="text-[10px] uppercase font-bold tracking-wider">TOKEN NUMBER</div>
          <div className="text-4xl font-black tracking-tight my-1">{createdTicket?.number || "A001"}</div>

          {selectedServiceObj && (
            <div className="text-xs font-bold">Service: {selectedServiceObj.name}</div>
          )}

          <div className="border-b border-black/40 my-1" />

          <div className="text-[11px] text-left space-y-0.5">
            <div>Name: {createdTicket?.customerName}</div>
            <div>Phone: {createdTicket?.contact}</div>
            {createdTicket?.customerEmail && <div>Email: {createdTicket.customerEmail}</div>}
            {createdTicket?.note && <div>Notes: {createdTicket.note}</div>}
            <div>Issued: {new Date().toLocaleTimeString()} ({new Date().toLocaleDateString()})</div>
            <div>Est. Wait: ~{(waitingCount + 1) * (selectedServiceObj?.avgMinutes || 10)} mins</div>
          </div>

          <div className="border-b border-black my-1" />
          <div className="text-[9px] text-gray-600">Please watch the branch display screen. We will call your token number shortly.</div>
          {(company?.supportPhone || company?.supportEmail) && (
            <div className="text-[9px] text-gray-600 font-semibold pt-1">
              Support: {company?.supportPhone || company?.supportEmail}
            </div>
          )}
        </div>
      </div>

      {/* Screen Header Bar */}
      <header className="absolute top-0 w-full z-20 flex items-center justify-between px-6 md:px-12 py-8 pointer-events-none">
        <div className="flex items-center gap-4">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="h-12 w-12 object-contain rounded-full shadow-sm bg-background/50 backdrop-blur-md p-1" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white text-2xl shadow-lg">
              {company?.name?.[0] || "Q"}
            </div>
          )}
          <div className="pointer-events-auto flex flex-col">
            <div className="font-display text-2xl font-bold tracking-tight text-foreground drop-shadow-sm leading-none">{company?.name || "Quesole"}</div>
            <div className="text-xs font-semibold text-muted-foreground lowercase flex gap-1 mt-1">
              {branch.name} branch <span className="text-brand">•</span> {branch.city}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6 pointer-events-auto">
          <div className="hidden md:flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-4 py-2 font-bold text-xs">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {waitingCount} People Waiting
          </div>
          <LiveClock />
          <ThemeToggle />
          <button
            onClick={() => {
              setEnteredPin("");
              setPinError(null);
              setIsStaffLockOpen(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground transition-colors shadow-sm border border-border/50"
            title="Staff Kiosk Controls"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Touch Screen Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative pt-24 pb-32">
        <AnimatePresence mode="wait">
          {/* STATE 0: Locked Screen — branches on isKotDirect */}
          {showLockScreen ? (
            isKotDirect ? (
              <KotLockScreen
                branchName={branch.name}
                initPin={initPin}
                setInitPin={setInitPin}
                initPinError={initPinError}
                setInitPinError={setInitPinError}
                isEvicted={isEvicted}
                kiosksList={kiosksList}
                selectedKioskId={selectedKioskId}
                setSelectedKioskId={setSelectedKioskId}
                isKotEnabledForBranch={isKotEnabledForBranch}
                onUnlock={async () => {
                  setInitPinError(null);
                  if (kiosksList.length === 0) {
                    setInitPinError("No kiosk slots provisioned for this branch.");
                    return;
                  }
                  if (!selectedKioskId) {
                    setInitPinError("Please select a kiosk terminal.");
                    return;
                  }
                  try {
                    const res = await apiFetch("/api/public/kiosks/login/", {
                      method: "POST",
                      body: JSON.stringify({ kiosk_id: selectedKioskId, pin: initPin })
                    });
                    setSessionToken(res.session_token);
                    setIsDeviceUnlocked(true);
                    setIsEvicted(false);
                    setInitPin("");
                    setKioskState("form");
                    toast.success(`${res.kiosk_identifier} unlocked!`);
                  } catch (err: any) {
                    setInitPinError(err.message || "Invalid PIN.");
                    setInitPin("");
                  }
                }}
              />
            ) : (
              <KioskLockScreen
                branchName={branch.name}
                initPin={initPin}
                setInitPin={setInitPin}
                initPinError={initPinError}
                setInitPinError={setInitPinError}
                isEvicted={isEvicted}
                kiosksList={kiosksList}
                selectedKioskId={selectedKioskId}
                setSelectedKioskId={setSelectedKioskId}
                onUnlock={async () => {
                  setInitPinError(null);
                  if (kiosksList.length === 0) {
                    setInitPinError("No kiosk slots provisioned for this branch.");
                    return;
                  }
                  if (!selectedKioskId) {
                    setInitPinError("Please select a kiosk terminal.");
                    return;
                  }
                  try {
                    const res = await apiFetch("/api/public/kiosks/login/", {
                      method: "POST",
                      body: JSON.stringify({ kiosk_id: selectedKioskId, pin: initPin })
                    });
                    setSessionToken(res.session_token);
                    setIsDeviceUnlocked(true);
                    setIsEvicted(false);
                    setInitPin("");
                    toast.success(`${res.kiosk_identifier} unlocked successfully!`);
                  } catch (err: any) {
                    setInitPinError(err.message || "Invalid PIN.");
                    setInitPin("");
                  }
                }}
              />
            )
          ) : kioskState === "idle" ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              onClick={() => setKioskState("form")}
              className="w-full max-w-[640px] cursor-pointer p-12 text-center shadow-[0_30px_80px_-15px_rgba(0,0,0,0.15)] transition-all duration-300 hover:shadow-[0_40px_100px_-20px_rgba(139,92,246,0.3)] space-y-10 rounded-[2.5rem] border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl"
            >
              <div className="flex justify-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-24 w-24 items-center justify-center rounded-3xl bg-brand/15 text-brand shadow-inner"
                >
                  <Touchpad className="h-12 w-12" />
                </motion.div>
              </div>

              <div className="space-y-3">
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-4 py-1 text-xs font-bold text-brand uppercase tracking-widest"
                >
                  Welcome to {branch.name}
                </motion.span>
                <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight text-foreground">
                  Tap Anywhere to Check In
                </h1>
                <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
                  Get your printed walk-in queue token instantly in seconds. No smartphone required.
                </p>
              </div>

              <div className="pt-6">
                <motion.div
                  animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 0 0 rgba(139,92,246,0.5)", "0 0 0 15px rgba(139,92,246,0)", "0 0 0 0 rgba(139,92,246,0)"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 px-10 py-5 text-xl font-bold text-white shadow-2xl shadow-brand/30 transition-transform active:scale-95"
                >
                  <Sparkles className="h-7 w-7" /> Touch Screen to Start
                </motion.div>
              </div>
            </motion.div>
          ) : kioskState === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-3xl relative"
            >
              <div className="absolute top-8 left-8 z-20">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={resetToIdle} 
                  className="text-muted-foreground hover:text-foreground font-bold text-xs uppercase tracking-wider gap-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full px-4 h-10"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              </div>
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center justify-center h-20 w-20 rounded-full bg-white dark:bg-slate-900 border-[6px] border-[#F8F9FE] dark:border-slate-950 shadow-xl text-brand">
                  <Touchpad className="h-8 w-8" />
                </div>
              </div>

              <form onSubmit={handleCheckInSubmit} className="pt-16 pb-10 px-10 space-y-8 shadow-[0_40px_100px_-20px_rgba(139,92,246,0.15)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] rounded-[2.5rem] border border-white/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl relative">

                <div className="text-center space-y-2">
                  <div className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" /> WALK-IN CHECK-IN <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  </div>
                  <h1 className="font-display text-5xl font-black text-brand tracking-tight">Welcome!</h1>
                  <p className="text-sm font-medium text-muted-foreground flex flex-col gap-1 items-center">
                    <span>Get your queue token instantly</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand/70 flex items-center gap-2">
                      <span className="w-6 border-b border-brand/30" />
                      No smartphone required
                      <span className="w-6 border-b border-brand/30" />
                    </span>
                  </p>
                </div>

                {formError && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{formError}</span>
                  </motion.div>
                )}

                {/* Form Field Inputs in 2 columns */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                  <div className="space-y-1.5 group">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 group-focus-within:text-brand transition-colors">Your Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60 group-focus-within:text-brand transition-colors" />
                      <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Rahul Sharma" required className="pl-11 h-12 rounded-xl border-border/50 bg-background/50 focus-visible:ring-brand/30 font-medium" />
                    </div>
                  </div>
                  <div className="space-y-1.5 group">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 group-focus-within:text-brand transition-colors">Mobile Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60 group-focus-within:text-brand transition-colors" />
                      <Input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g. 9876543210" required className="pl-11 h-12 rounded-xl border-border/50 bg-background/50 focus-visible:ring-brand/30 font-mono text-sm" />
                      {customerPhone.length >= 6 && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-emerald-500">
                          <CheckCircle2 className="h-5 w-5" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 group">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 group-focus-within:text-brand transition-colors">Email Address (Optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60 group-focus-within:text-brand transition-colors" />
                      <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="e.g. rahul@example.com" className="pl-11 h-12 rounded-xl border-border/50 bg-background/50 focus-visible:ring-brand/30 font-medium" />
                    </div>
                  </div>
                  <div className="space-y-1.5 group">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 group-focus-within:text-brand transition-colors">Note / Message (Optional)</Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60 group-focus-within:text-brand transition-colors" />
                      <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Urgent inquiry" className="pl-11 h-12 rounded-xl border-border/50 bg-background/50 focus-visible:ring-brand/30 font-medium" />
                    </div>
                  </div>

                  {/* Delivery Channel selector */}
                  {isKotDirect ? (
                    // KOT Direct link: no selector, show a locked info banner
                    <div className="col-span-1 md:col-span-2 flex items-center gap-3 text-[11px] font-semibold text-brand bg-brand/5 border border-brand/20 rounded-xl p-3">
                      <MessageSquare className="h-4 w-4 shrink-0 text-brand" />
                      <span>
                        KOT Direct Check-In —{" "}
                        {deliveryChannel === "sms" && "Your queue token will be sent via SMS."}
                        {deliveryChannel === "whatsapp" && "Your queue token will be sent via WhatsApp."}
                      </span>
                    </div>
                  ) : (
                    <>
                      {((hasKioskPrinted ? 1 : 0) + (hasSms ? 1 : 0) + (hasWhatsapp ? 1 : 0)) > 1 && (
                        <div className="space-y-1.5 col-span-1 md:col-span-2 group">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 group-focus-within:text-brand transition-colors">
                            Choose Delivery Method *
                          </Label>
                          <div className="flex flex-wrap gap-3">
                            {hasKioskPrinted && (
                              <button
                                type="button"
                                onClick={() => setDeliveryChannel("kiosk")}
                                className={cn(
                                  "flex-1 min-w-[120px] h-12 rounded-xl border font-bold text-xs transition-colors cursor-pointer",
                                  deliveryChannel === "kiosk" ? "border-brand bg-brand/5 text-brand" : "border-border bg-background/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                              >
                                Printed Slip
                              </button>
                            )}
                            {hasSms && (
                              <button
                                type="button"
                                onClick={() => setDeliveryChannel("sms")}
                                className={cn(
                                  "flex-1 min-w-[120px] h-12 rounded-xl border font-bold text-xs transition-colors cursor-pointer",
                                  deliveryChannel === "sms" ? "border-brand bg-brand/5 text-brand" : "border-border bg-background/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                              >
                                SMS Token
                              </button>
                            )}
                            {hasWhatsapp && (
                              <button
                                type="button"
                                onClick={() => setDeliveryChannel("whatsapp")}
                                className={cn(
                                  "flex-1 min-w-[120px] h-12 rounded-xl border font-bold text-xs transition-colors cursor-pointer",
                                  deliveryChannel === "whatsapp" ? "border-brand bg-brand/5 text-brand" : "border-border bg-background/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                              >
                                WhatsApp Token
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {((hasKioskPrinted ? 1 : 0) + (hasSms ? 1 : 0) + (hasWhatsapp ? 1 : 0)) === 1 && (
                        <div className="col-span-1 md:col-span-2 text-[11px] font-semibold text-brand bg-brand/5 border border-brand/20 rounded-xl p-3">
                          {hasKioskPrinted && "Token delivery: A physical slip will be printed for you."}
                          {hasSms && "Token delivery: We will send your queue ticket directly to your phone via SMS."}
                          {hasWhatsapp && "Token delivery: We will send your queue ticket directly to your phone via WhatsApp."}
                        </div>
                      )}
                    </>
                  )}

                  {isServiceMode && services.length > 0 && (
                    <div className="space-y-1.5 group col-span-1 md:col-span-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 group-focus-within:text-brand transition-colors">Select Service Category *</Label>
                      <div className="relative">
                        <select
                          value={selectedServiceId}
                          onChange={(e) => setSelectedServiceId(e.target.value)}
                          required
                          className="w-full h-12 px-4 rounded-xl border border-border/50 bg-background bg-slate-50 dark:bg-slate-900/60 focus-visible:ring-brand/30 font-medium text-sm outline-none appearance-none"
                        >
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.prefix})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="pt-4 flex flex-col items-center">
                  <Button type="submit" disabled={isSubmitting || !customerName.trim() || !customerPhone.trim()} className="w-full md:w-[80%] h-14 text-lg font-bold rounded-full shadow-xl shadow-brand/25 transition-transform active:scale-95 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white border-0 gap-3">
                    <AnimatePresence mode="wait">
                      {isSubmitting ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Creating Token...</span>
                        </motion.div>
                      ) : (
                        <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          <TicketIcon className="h-6 w-6 opacity-80" /> {deliveryChannel === "kiosk" ? "Get My Printed Token" : "Receive Digital Token"} <ArrowRight className="h-5 w-5 opacity-70 ml-2" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                  <div className="mt-4 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Your information is safe with us and will not be shared.
                  </div>
                </motion.div>
              </form>
            </motion.div>
          ) : kioskState === "confirmation" && createdTicket ? (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg p-12 text-center space-y-8 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.15)] rounded-[2.5rem] border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl relative overflow-hidden"
            >
              {/* Confetti/Burst background effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />

              <div className="flex justify-center relative z-10">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-500 shadow-inner"
                >
                  <CheckCircle2 className="h-10 w-10" />
                </motion.div>
              </div>

              {(() => {
                const isDigital = createdTicket.method === "3" || createdTicket.method === "4" || createdTicket.method === 3 || createdTicket.method === 4;
                if (isDigital) {
                  return (
                    <div className="space-y-4 relative z-10 py-6">
                      <div className="text-lg font-black text-brand uppercase tracking-wider">Check Your Phone!</div>
                      <p className="text-sm font-semibold text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        We have successfully sent your queue token details to <strong className="text-foreground">{createdTicket.contact}</strong> via {createdTicket.method === "4" || createdTicket.method === 4 ? "WhatsApp" : "SMS"}.
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">
                        Token number hidden on-screen for privacy
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="space-y-1 relative z-10">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Token Number</motion.div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", bounce: 0.4, delay: 0.3 }}
                        className="font-display text-7xl md:text-8xl font-black tracking-tight text-foreground text-brand drop-shadow-md"
                      >
                        {createdTicket.number}
                      </motion.div>
                    </div>

                    {selectedServiceObj && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1 text-xs font-bold text-foreground">
                        Service: {selectedServiceObj.name}
                      </motion.div>
                    )}
                  </>
                );
              })()}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="rounded-2xl border border-border/80 bg-accent/30 p-4 text-xs space-y-1 text-muted-foreground">
                <p className="font-semibold text-foreground">
                  {createdTicket.method === "3" || createdTicket.method === "4" || createdTicket.method === 3 || createdTicket.method === 4
                    ? "Keep an eye on your messages and watch the branch display board."
                    : "Please take your printed slip below and watch the branch display board."}
                </p>
                <p>Est. Wait Time: ~{(waitingCount + 1) * (selectedServiceObj?.avgMinutes || 10)} mins</p>
              </motion.div>

              {printFailed && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 font-semibold flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Printer unavailable: Your token number is <strong>{createdTicket.number}</strong>. Please note it down!</span>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="pt-2 flex flex-col items-center gap-4 relative z-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetToIdle}
                  className="w-full h-12 text-sm font-semibold rounded-xl"
                >
                  Done / Next Customer
                </Button>

                <div className="flex items-center gap-3">
                  <TimeoutRing timeoutSeconds={branch.kioskIdleTimeoutSeconds || 8} onComplete={resetToIdle} />
                  <span className="text-[11px] font-semibold text-muted-foreground">Auto-resetting...</span>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Footer Features */}
      <footer className="absolute bottom-6 w-full z-20 px-6 md:px-12 pointer-events-none flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-full px-8 py-4 shadow-sm border border-white/50 dark:border-slate-800 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 rounded-full bg-brand/10 text-brand items-center justify-center"><ShieldCheck className="h-4 w-4" /></div>
            <div className="text-left leading-tight"><div className="text-xs font-bold text-foreground">Secure Access</div><div className="text-[9px] text-muted-foreground font-medium">Protected by advanced security</div></div>
          </div>
          {isKotDirect ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 items-center justify-center"><MessageSquare className="h-4 w-4" /></div>
                <div className="text-left leading-tight"><div className="text-xs font-bold text-foreground">SMS &amp; WhatsApp</div><div className="text-[9px] text-muted-foreground font-medium">Token delivered to your phone</div></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 rounded-full bg-teal-500/10 text-teal-500 items-center justify-center"><Phone className="h-4 w-4" /></div>
                <div className="text-left leading-tight"><div className="text-xs font-bold text-foreground">No Screen Required</div><div className="text-[9px] text-muted-foreground font-medium">Check queue status on your phone</div></div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 items-center justify-center"><Wifi className="h-4 w-4" /></div>
                <div className="text-left leading-tight"><div className="text-xs font-bold text-foreground">Offline Ready</div><div className="text-[9px] text-muted-foreground font-medium">Works even without internet</div></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 items-center justify-center"><TicketIcon className="h-4 w-4" /></div>
                <div className="text-left leading-tight"><div className="text-xs font-bold text-foreground">Instant Token</div><div className="text-[9px] text-muted-foreground font-medium">Get your token in seconds</div></div>
              </div>
            </>
          )}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 rounded-full bg-orange-500/10 text-orange-500 items-center justify-center"><Headset className="h-4 w-4" /></div>
            <div className="text-left leading-tight"><div className="text-xs font-bold text-foreground">Need Help?</div><div className="text-[9px] text-muted-foreground font-medium">Contact your administrator</div></div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground/60 font-medium">
          &copy; {new Date().getFullYear()} Quesole Technologies Pvt. Ltd. All rights reserved.
        </div>
      </footer>

      {/* STATE 4: Staff Exit / PIN Lock Gate Modal */}
      {isStaffLockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-brand" />
                <h3 className="text-base font-bold">Staff Kiosk Exit Gate</h3>
              </div>
              <button
                onClick={() => setIsStaffLockOpen(false)}
                className="text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStaffUnlockSubmit} className="space-y-4">
              {pinError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-semibold">
                  {pinError}
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enter Kiosk Password / PIN *</Label>
                <Input
                  type="password"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="Enter staff PIN"
                  autoFocus
                  required
                  className="mt-1 font-mono text-center text-lg rounded-xl h-11 tracking-widest"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStaffLockOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="brand" className="text-xs gap-1.5">
                  <LogOut className="h-4 w-4" /> Exit Kiosk Mode
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Lock Screen Sub-Components (shared PIN logic via onUnlock callback)
// ----------------------------------------------------------------------

type LockScreenProps = {
  branchName: string;
  initPin: string;
  setInitPin: (v: string) => void;
  initPinError: string | null;
  setInitPinError: (v: string | null) => void;
  isEvicted: boolean;
  kiosksList: any[];
  selectedKioskId: string;
  setSelectedKioskId: (v: string) => void;
  onUnlock: () => Promise<void>;
};

/** Original purple-blue kiosk lock screen — full terminal selector dropdown */
function KioskLockScreen({
  branchName, initPin, setInitPin, initPinError, setInitPinError,
  isEvicted, kiosksList, selectedKioskId, setSelectedKioskId, onUnlock
}: LockScreenProps) {
  return (
    <motion.div
      key="lock-kiosk"
      initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
      className="w-full max-w-[480px] p-10 md:p-12 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.15)] rounded-[2.5rem] space-y-10 border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl"
    >
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center h-28 w-28">
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 rounded-full bg-violet-500/20" />
            <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute inset-2 rounded-full bg-violet-500/30" />
            <motion.div
              animate={initPinError ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={initPinError ? { duration: 0.4 } : {}}
              className={cn("relative z-10 flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors", initPinError ? "bg-destructive text-primary-foreground" : "bg-gradient-to-br from-violet-500 to-blue-500 text-white")}
            >
              <Lock className="h-7 w-7" />
            </motion.div>
          </div>
        </div>
        <h2 className="font-display text-4xl font-bold tracking-tight text-foreground text-center">Kiosk Locked</h2>
        <p className="text-sm font-medium text-muted-foreground/80 mt-2">
          Please enter the PIN for <strong className="text-violet-600 dark:text-violet-400">{branchName}</strong><br />to unlock this terminal.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onUnlock(); }} className="space-y-6">
        {isEvicted && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-semibold text-center animate-pulse">
            Session evicted: this kiosk was opened on another screen or its PIN was regenerated.
          </div>
        )}
        {kiosksList.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Select Kiosk Terminal</Label>
            <select value={selectedKioskId} onChange={(e) => setSelectedKioskId(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border/50 bg-background dark:bg-slate-900/60 font-medium text-sm outline-none appearance-none">
              {kiosksList.map((k: any) => (
                <option key={k.id} value={k.id}>{k.kiosk_identifier} {k.is_logged_in ? "(In Use)" : "(Available)"}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 font-semibold text-center">
            No kiosks provisioned for this branch. Allocate kiosk screens in your subscription config.
          </div>
        )}
        <div className="space-y-6 relative flex flex-col items-center">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground self-start ml-1 mb-2">Enter 4-Digit Kiosk PIN</Label>
          <SegmentedPin length={4} value={initPin} onChange={(v) => { setInitPinError(null); setInitPin(v); }} error={!!initPinError} shakeTrigger={initPinError ? Date.now() : 0} />
          {initPinError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive font-bold text-center mt-2">{initPinError}</motion.p>
          )}
        </div>
        <Button type="submit" disabled={initPin.length < 4 || kiosksList.length === 0} className="w-full h-14 text-lg font-bold rounded-full shadow-xl transition-transform active:scale-95 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white border-0 gap-2">
          <Lock className="h-5 w-5 opacity-70" /> Unlock Terminal <ArrowRight className="h-5 w-5 opacity-70 ml-2" />
        </Button>
      </form>
    </motion.div>
  );
}

type KotLockScreenProps = LockScreenProps & { isKotEnabledForBranch: boolean };

/** Emerald-green KOT-specific lock screen — no terminal selector, message bubble icon */
function KotLockScreen({
  branchName, initPin, setInitPin, initPinError, setInitPinError,
  isEvicted, kiosksList, selectedKioskId, setSelectedKioskId,
  isKotEnabledForBranch, onUnlock
}: KotLockScreenProps) {
  return (
    <motion.div
      key="lock-kot"
      initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
      className="w-full max-w-[480px] p-10 md:p-12 shadow-[0_30px_80px_-15px_rgba(16,185,129,0.2)] rounded-[2.5rem] space-y-10 border border-emerald-200/60 dark:border-emerald-800/30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl"
    >
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center h-28 w-28">
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 rounded-full bg-emerald-500/20" />
            <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute inset-2 rounded-full bg-emerald-500/30" />
            <motion.div
              animate={initPinError ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={initPinError ? { duration: 0.4 } : {}}
              className={cn("relative z-10 flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors", initPinError ? "bg-destructive text-primary-foreground" : "bg-gradient-to-br from-emerald-500 to-teal-500 text-white")}
            >
              <MessageSquare className="h-7 w-7" />
            </motion.div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
            KOT Check-In
          </div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-foreground text-center">KOT Check-In Locked</h2>
          <p className="text-sm font-medium text-muted-foreground/80 mt-2">
            Enter the PIN to unlock <strong className="text-emerald-600 dark:text-emerald-400">SMS / WhatsApp</strong> token check-in<br />for <strong className="text-foreground">{branchName}</strong>.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onUnlock(); }} className="space-y-6">
        {isEvicted && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-semibold text-center animate-pulse">
            Session evicted: this kiosk was opened on another screen or its PIN was regenerated.
          </div>
        )}
        {/* KOT flow does NOT show terminal selector — single dedicated check-in path */}
        {kiosksList.length === 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 font-semibold text-center">
            No kiosks provisioned for this branch. Please contact your administrator.
          </div>
        )}
        <div className="space-y-6 relative flex flex-col items-center">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground self-start ml-1 mb-2">Enter 4-Digit PIN</Label>
          <SegmentedPin length={4} value={initPin} onChange={(v) => { setInitPinError(null); setInitPin(v); }} error={!!initPinError} shakeTrigger={initPinError ? Date.now() : 0} />
          {initPinError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive font-bold text-center mt-2">{initPinError}</motion.p>
          )}
        </div>
        <Button type="submit" disabled={initPin.length < 4 || kiosksList.length === 0} className="w-full h-14 text-lg font-bold rounded-full shadow-xl shadow-emerald-500/25 transition-transform active:scale-95 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 gap-2">
          <MessageSquare className="h-5 w-5 opacity-80" /> Unlock KOT Check-In <ArrowRight className="h-5 w-5 opacity-70 ml-2" />
        </Button>
      </form>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Visual Overlay & Helper Components
// ----------------------------------------------------------------------

function KioskBackground({ 
  customerName, 
  selectedServiceName,
  servicePrefix,
  waitingCount = 0
}: { 
  customerName?: string; 
  selectedServiceName?: string;
  servicePrefix?: string;
  waitingCount?: number;
} = {}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-500">
      {/* 1. Base CSS Layer: Soft Gradient + Dotted Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-50/80 via-purple-50/30 to-white dark:from-indigo-950/40 dark:via-slate-950 dark:to-slate-950 transition-colors duration-500" />
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(circle at center, #000 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
      />

      {/* 2. SVG Wavy Lines Layer (Scalable and Responsive) */}
      <svg
        className="absolute top-0 left-0 w-full h-[70%] md:h-[90%] opacity-70 dark:opacity-20"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1920 1080"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M-100,500 C 400,100 1200,900 2100,300" stroke="currentColor" className="text-violet-400" strokeWidth="1.5" />
        <path d="M-100,530 C 450,130 1250,930 2100,330" stroke="currentColor" className="text-indigo-400" strokeWidth="1" />
        <path d="M-100,560 C 500,160 1300,960 2100,360" stroke="currentColor" className="text-blue-400" strokeWidth="2" />
        <path d="M-100,590 C 550,190 1350,990 2100,390" stroke="currentColor" className="text-purple-400" strokeWidth="0.5" />
        <path d="M-100,620 C 600,220 1400,1020 2100,420" stroke="currentColor" className="text-teal-400" strokeWidth="1" />
      </svg>

      {/* 3. Pure CSS 3D Pedestals and Objects */}

      {/* Kiosk (Left) */}
      <div className="absolute bottom-20 -left-12 w-48 opacity-40 md:bottom-28 md:left-4 md:w-56 md:opacity-80 lg:left-12 lg:w-72 lg:opacity-100 xl:bottom-32 xl:left-24 xl:w-80 transition-all duration-700 ease-out z-0 group">
        {/* Neon Pedestal */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 md:h-12 rounded-[100%] bg-brand/30 shadow-[0_0_40px_rgba(139,92,246,0.5)] blur-md border border-brand/50 dark:bg-brand/50 dark:shadow-[0_0_60px_rgba(139,92,246,0.8)]" />
        {/* Flat/Soft Kiosk with pure transparent alpha (No mix-blend-mode needed!) */}
        <motion.div 
          animate={shouldReduceMotion ? {} : { y: [0, -15, 0] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 w-full h-auto drop-shadow-2xl"
        >
          <img src="/kiosk-soft.png" alt="" className="w-full h-auto" />
        </motion.div>
      </div>

      {/* 3D Token (Right) - CSS Only - Hidden on smallest screens to prevent crowding */}
      <div className="hidden md:block absolute bottom-32 md:right-8 lg:right-16 xl:right-32 w-48 lg:w-56 transition-all duration-700 ease-out z-0">
        {/* Neon Pedestal */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[120%] h-12 rounded-[100%] bg-brand/30 shadow-[0_0_40px_rgba(139,92,246,0.5)] blur-md border border-brand/50 dark:bg-brand/50 dark:shadow-[0_0_60px_rgba(139,92,246,0.8)]" />

        <motion.div 
          animate={shouldReduceMotion ? {} : { y: [0, -20, 0] }} 
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="relative z-10 w-full"
        >
          {/* Pure CSS 3D Token Card */}
          <div
            className="w-full aspect-[2/3] bg-white dark:bg-slate-900 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.2)] p-0 flex flex-col items-center border border-white/50 dark:border-slate-700 overflow-hidden"
            style={{ transform: 'perspective(1000px) rotateY(-15deg) rotateZ(8deg) translateY(-20px)' }}
          >
          {/* Top colored accent */}
          <div className="h-2.5 w-full bg-gradient-to-r from-violet-500 to-blue-500 shrink-0" />
          
          <div className="p-6 flex flex-col items-center justify-between flex-1 w-full">
            <div className="space-y-1 w-full text-center shrink-0">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Token</div>
            </div>
            
            <div className="flex flex-col items-center justify-center w-full min-h-0 py-2">
              <div className="font-display text-[4rem] md:text-[4.5rem] lg:text-[5rem] font-black tracking-tighter text-brand leading-none text-center w-full whitespace-nowrap drop-shadow-sm">
                {servicePrefix || "A"}125
              </div>
              <div className="h-6 mt-1 w-full flex items-center justify-center">
                {customerName ? (
                  <div className="text-sm font-bold text-foreground text-center w-full truncate px-2">
                    {customerName}
                  </div>
                ) : (
                  <div className="text-sm font-bold text-muted-foreground/30 text-center w-full truncate px-2 uppercase tracking-widest">
                    GUEST
                  </div>
                )}
              </div>
              <div className="h-5 mt-1 w-full flex items-center justify-center">
                {selectedServiceName && (
                  <div className="text-[9px] font-semibold text-muted-foreground text-center truncate px-3 border border-border/60 rounded-full py-0.5 bg-accent/30 mx-auto">
                    {selectedServiceName}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full shrink-0 space-y-4">
              <div className="w-full border-t-[3px] border-dashed border-border/60" />
              
              <div className="flex items-center justify-between w-full px-2">
                <div className="flex flex-col items-start gap-1">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Live Queue</div>
                  <div className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    {waitingCount} waiting
                  </div>
                </div>
                <div className="h-10 w-10 bg-black/5 dark:bg-white/10 rounded-lg p-1.5 flex items-center justify-center shrink-0">
                  <QrCode className="h-full w-full text-foreground/40" />
                </div>
              </div>
            </div>
          </div>
        </div>
        </motion.div>
      </div>

      {/* Floating Scene Decorative Bubbles */}
      <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/4 left-1/4 h-12 w-12 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-lg border border-white/50 dark:border-slate-700 flex items-center justify-center text-brand z-10 backdrop-blur-md hidden lg:flex">
        <User className="h-5 w-5" />
      </motion.div>
      <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-1/3 left-1/3 h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-lg border border-emerald-500/30 flex items-center justify-center z-10 backdrop-blur-md hidden md:flex">
        <ShieldCheck className="h-4 w-4" />
      </motion.div>
      <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute top-1/4 right-1/4 h-12 w-12 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-lg border border-blue-500/30 flex items-center justify-center z-10 backdrop-blur-md hidden lg:flex">
        <QrCode className="h-5 w-5" />
      </motion.div>

      {/* Fallback for reduced motion */}
      {shouldReduceMotion && (
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-80" />
      )}

      {/* 4. Floating Animated CSS Orbs (Layered on top to keep it "alive") */}
      {!shouldReduceMotion && (
        <div className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-20">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-brand/40 blur-[100px]"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2], x: [0, -30, 0], y: [0, 50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/30 blur-[120px]"
          />
          <motion.div
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[30%] left-[40%] w-[40vw] h-[40vw] rounded-full bg-brand/20 blur-[80px]"
          />
        </div>
      )}
    </div>
  );
}

function SegmentedPin({ length = 6, value, onChange, error, shakeTrigger }: { length?: number; value: string; onChange: (v: string) => void; error?: boolean; shakeTrigger?: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("flex items-center justify-center gap-3", error && shouldReduceMotion ? "p-2 rounded-xl border border-destructive" : "")}
      animate={error && !shouldReduceMotion ? { x: [-10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
      key={shakeTrigger}
    >
      {/* Hidden actual input to capture typing seamlessly */}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, length))}
        className="absolute inset-0 opacity-0 cursor-text z-10 w-full h-full"
        autoFocus
      />

      {Array.from({ length }).map((_, i) => {
        const isFilled = i < value.length;
        const isFocused = i === value.length;

        return (
          <div
            key={i}
            className={cn(
              "w-4 h-4 rounded-full transition-all duration-300 relative",
              isFilled ? "bg-brand scale-110 shadow-[0_0_8px_rgba(139,92,246,0.5)]" : "bg-muted scale-100",
              error ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" : ""
            )}
          >
            {isFocused && !isFilled && !error && (
              <motion.div
                layoutId="pin-focus"
                className="absolute -inset-2 rounded-full border-2 border-brand/50"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

function TimeoutRing({ timeoutSeconds, onComplete }: { timeoutSeconds: number; onComplete: () => void }) {
  const shouldReduceMotion = useReducedMotion();
  const radius = 20;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, timeoutSeconds * 1000);
    return () => clearTimeout(timer);
  }, [timeoutSeconds, onComplete]);

  if (shouldReduceMotion) {
    return <div className="h-10 w-10 animate-pulse bg-brand/20 rounded-full flex items-center justify-center text-xs font-bold text-brand">{timeoutSeconds}s</div>;
  }

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
        {/* Background ring */}
        <circle
          cx="25"
          cy="25"
          r={radius}
          className="stroke-muted/40"
          strokeWidth="4"
          fill="none"
        />
        {/* Animated countdown ring */}
        <motion.circle
          cx="25"
          cy="25"
          r={radius}
          className="stroke-brand"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: circumference }}
          transition={{ duration: timeoutSeconds, ease: "linear" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Printer className="h-4 w-4 text-brand/60" />
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  };

  return (
    <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors shadow-sm backdrop-blur-md border border-border/40">
      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-amber-500" />}
    </button>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="font-display font-bold text-foreground tracking-tight text-sm md:text-base">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div className="text-[10px] md:text-xs font-medium text-muted-foreground">{time.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
  );
}
