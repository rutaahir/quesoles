import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, MonitorPlay, PhoneCall, QrCode, SkipForward, UserPlus, Search, Calendar, Clock, User, Check, X, ChevronRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/console/shell";
import {
  useQuesole,
  branchStats,
  ticketsOf,
  waitingOf,
  planOf,
  isNoServiceMode,
  apiFetch
} from "@/lib/quesole/store";
import { QueueMethod } from "@/lib/quesole/types";
import { CountUp, FlipNumber, Reveal, motion, AnimatePresence } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";

export function BranchConsoleView({
  view,
  branchId,
  deskId,
}: {
  view: string;
  branchId: string;
  deskId?: string | undefined;
}) {
  const { state, session, actions } = useQuesole();
  const branch = state.branches.find((b) => b.id === branchId);
  const desks = state.desks.filter((d) => d.branchId === branchId);
  const stats = branchStats(state, branchId);
  const waiting = waitingOf(state, branchId);
  const tickets = ticketsOf(state, branchId);

  // Manual ticket state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualServiceId, setManualServiceId] = useState("");
  const [isIssuing, setIsIssuing] = useState(false);

  // Transfer ticket state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Online bookings operator console states
  const [onlineBookings, setOnlineBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");

  // Rescheduling states
  const [rescheduleBooking, setRescheduleBooking] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);

  const fetchOnlineBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const data = await apiFetch(`/api/online-bookings/?branch=${branchId}`);
      setOnlineBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (view === "appointments") {
      fetchOnlineBookings();
    }
  }, [view, branchId]);

  // Fetch rescheduling slots when date changes
  useEffect(() => {
    if (!rescheduleBooking || !rescheduleDate) return;
    const fetchAvailableRescheduleSlots = async () => {
      setIsLoadingRescheduleSlots(true);
      try {
        const serviceQuery = rescheduleBooking.service ? `&service_id=${rescheduleBooking.service}` : "";
        const data = await apiFetch(`/api/public/branches/${branchId}/slots/?date=${rescheduleDate}${serviceQuery}`);
        setRescheduleSlots(data);
      } catch (err) {
        console.error(err);
        setRescheduleSlots([]);
      } finally {
        setIsLoadingRescheduleSlots(false);
      }
    };
    fetchAvailableRescheduleSlots();
  }, [rescheduleBooking, rescheduleDate, branchId]);

  if (!branch) return <p className="text-muted-foreground">No branch selected.</p>;

  if (view === "desk") {
    const currentStaffUser = state.staff.find((st) => st.email.toLowerCase() === (session?.email || "").toLowerCase());
    const userAssignedServices = currentStaffUser
      ? state.userServices.filter((us) => String(us.userId) === String(currentStaffUser.id)).map((us) => String(us.serviceId))
      : [];

    const resolvedDeskId = currentStaffUser?.deskId || deskId;
    const desk = desks.find((d) => String(d.id) === String(resolvedDeskId)) ?? desks[0];
    if (!desk) return <p className="text-muted-foreground">No desk assigned.</p>;

    const deskServices = state.deskServices
      .filter((ds) => String(ds.deskId) === String(desk.id))
      .map((ds) => String(ds.serviceId));

    // Calculate allowed services for queue filtering:
    // 1. If desk has specific DeskServices, and staff has UserServices -> Intersection
    // 2. If desk has no DeskServices yet -> Use staff's UserServices
    // 3. If staff has no UserServices (or viewing as admin) -> Use desk's DeskServices or all branch services
    let allowedServiceIds: string[] = [];
    if (userAssignedServices.length > 0) {
      if (deskServices.length > 0) {
        allowedServiceIds = deskServices.filter((sId) => userAssignedServices.includes(sId));
        if (allowedServiceIds.length === 0) {
          allowedServiceIds = userAssignedServices;
        }
      } else {
        allowedServiceIds = userAssignedServices;
      }
    } else if (deskServices.length > 0) {
      allowedServiceIds = deskServices;
    } else {
      allowedServiceIds = state.services.filter((s) => String(s.branchId) === String(branchId)).map((s) => String(s.id));
    }

    const current = tickets.find(
      (t) => String(t.deskId) === String(desk.id) && (t.status === "serving" || t.status === "called"),
    );

    const queue = waiting
      .filter((t) => {
        if (t.deskId) {
          return String(t.deskId) === String(desk.id);
        }
        if (t.predictedDeskId) {
          return String(t.predictedDeskId) === String(desk.id);
        }
        if (branch.method === 1) return true;
        if (allowedServiceIds.length === 0) return true;
        return allowedServiceIds.includes(String(t.serviceId));
      })
      .sort((a, b) => a.joinedAt - b.joinedAt);

    const noService = isNoServiceMode(branch.companyId, state.companyAllocations);
    if (!noService && branch.method >= 2 && currentStaffUser && userAssignedServices.length === 0) {
      return (
        <div className="panel p-8 text-center space-y-3 border-amber-500/30 bg-amber-500/5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 font-bold text-xl">
            ⚠️
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">Service Assignment Required</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You haven't been assigned to any service yet — contact your branch admin.
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="panel overflow-hidden">
          <div className="bg-brand px-6 py-8 text-center text-primary-foreground">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">
              {desk.label} · now serving
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={current?.number ?? "idle"}
                initial={{ y: 22, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -22, opacity: 0 }}
                className="mt-1 font-display text-6xl font-bold"
              >
                {current ? <FlipNumber value={current.number} /> : "—"}
              </motion.div>
            </AnimatePresence>
            <div className="mt-2 text-sm opacity-85">
              {current ? current.customerName : "Ready for the next visitor"}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="brand"
                size="lg"
                disabled={!!current || queue.length === 0}
                onClick={async () => {
                  try {
                    const res: any = await actions.callNext(desk.id);
                    if (res?.number) {
                      toast.success(`Called token ${res.number}`);
                    } else if (res?.message) {
                      toast.info(res.message);
                    } else {
                      toast.success("Next visitor called");
                    }
                  } catch (err: any) {
                    toast.error(err.message || "Failed to call next visitor");
                  }
                }}
                className="w-full shadow-lg shadow-brand/20 font-bold"
              >
                <PhoneCall className="h-4 w-4 mr-1.5" /> Call Next
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={!current}
                onClick={async () => {
                  if (!current) return;
                  try {
                    await actions.setTicketStatus(current.id, "skipped");
                    toast.info(`Skipped ticket ${current.number}`);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to skip ticket");
                  }
                }}
                className="w-full font-semibold"
              >
                <SkipForward className="h-4 w-4 mr-1.5" /> Skip
              </Button>
            </div>

            {/* Visitor Service Resolution & Transfer Controls */}
            <div className="border-t border-border/60 pt-4 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Visitor Disposition Options</span>
                {current && <span className="text-brand font-semibold">Active: {current.number} ({current.customerName})</span>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* 1. Resolved */}
                <button
                  type="button"
                  disabled={!current}
                  onClick={async () => {
                    if (!current) return;
                    try {
                      await actions.setTicketStatus(current.id, "served");
                      toast.success(`Ticket ${current.number} (${current.customerName}) marked as Resolved!`);
                    } catch (err: any) {
                      toast.error(err.message || "Failed to resolve ticket");
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all",
                    current
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 shadow-sm cursor-pointer"
                      : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
                  )}
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Resolved</span>
                </button>

                {/* 2. Escalated */}
                <button
                  type="button"
                  disabled={!current}
                  onClick={async () => {
                    if (!current) return;
                    try {
                      await actions.setTicketStatus(current.id, "hold");
                      toast.warning(`Ticket ${current.number} (${current.customerName}) Escalated for supervisor review.`);
                    } catch (err: any) {
                      toast.error(err.message || "Failed to escalate ticket");
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all",
                    current
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 shadow-sm cursor-pointer"
                      : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
                  )}
                >
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>Escalated</span>
                </button>

                {/* 3. Transfer */}
                <button
                  type="button"
                  disabled={!current}
                  onClick={() => {
                    if (current) setIsTransferModalOpen(true);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all",
                    current
                      ? "border-brand/40 bg-brand/10 text-brand hover:bg-brand/20 hover:border-brand shadow-sm cursor-pointer"
                      : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
                  )}
                >
                  <ArrowRightLeft className="h-5 w-5 text-brand" />
                  <span>Transfer</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Your queue
              </h3>
              <span className="text-xs tabular-nums text-muted-foreground">{queue.length} waiting</span>
            </div>

            {/* Authenticated Staff Manual Ticket Issue Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setManualName("");
                setManualPhone("");
                setManualServiceId(allowedServiceIds[0] || "");
                setIsManualModalOpen(true);
              }}
              className="h-8 text-xs font-semibold border-brand/40 text-brand hover:bg-brand/10"
            >
              + Manual Walk-in Ticket
            </Button>
          </div>
          <div className="mt-4 grid gap-2">
            <AnimatePresence initial={false}>
              {queue.slice(0, 10).map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between gap-3 rounded-xl bg-accent/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-display text-lg font-bold tabular-nums">{t.number}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.customerName} · {state.services.find((s) => s.id === t.serviceId)?.name}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {Math.max(1, Math.round((Date.now() - t.joinedAt) / 60000))}m
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {queue.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Queue is clear.</p>
            ) : null}
          </div>
        </div>

        {/* Modal: Manual Walk-in Ticket Issue (Desk Operator Authenticated) */}
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="panel w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-brand" />
                  <h3 className="font-bold text-base">Issue Manual Walk-in Ticket</h3>
                </div>
                <button onClick={() => setIsManualModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                  ✕
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsIssuing(true);
                  try {
                    const ticket = await actions.issueManualTicket({
                      branchId: branch.id,
                      name: manualName.trim() || "Walk-in Visitor",
                      phone: manualPhone.trim() || "Walk-in",
                      serviceId: manualServiceId || allowedServiceIds[0] || "",
                      deskId: desk.id
                    });
                    toast.success(`Token ${ticket.token_number || "created"} issued for ${manualName.trim() || "Walk-in"}!`);
                    setIsManualModalOpen(false);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to issue manual ticket.");
                  } finally {
                    setIsIssuing(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Visitor Name
                  </Label>
                  <Input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Ramesh Patel (or leave blank)"
                    className="mt-1 h-10 rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact Phone (Optional)
                  </Label>
                  <Input
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="mt-1 h-10 rounded-xl"
                  />
                </div>

                {allowedServiceIds.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Service Category *
                    </Label>
                    <select
                      value={manualServiceId}
                      onChange={(e) => setManualServiceId(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-input bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {state.services
                        .filter((s) => s.branchId === branch.id && allowedServiceIds.includes(s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Prefix: {s.prefix})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="brand" disabled={isIssuing}>
                    {isIssuing ? "Issuing..." : "Issue Ticket"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Transfer Ticket to Another Counter Desk */}
        {isTransferModalOpen && current && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="panel w-full max-w-lg p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand font-bold">
                    <ArrowRightLeft className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      Transfer Ticket {current.number}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Re-route visitor <span className="font-bold text-foreground">{current.customerName}</span> to another counter desk
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs rounded-xl bg-accent/30 p-3 border border-border">
                  <span className="text-muted-foreground font-medium">Current Location:</span>
                  <span className="font-bold text-foreground">{desk.label}</span>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Select Target Counter Desk
                  </Label>
                  <div className="mt-2 grid gap-2 max-h-60 overflow-y-auto pr-1">
                    {desks
                      .filter((d) => String(d.id) !== String(desk.id))
                      .map((targetDesk) => {
                        const targetDeskServices = state.deskServices
                          .filter((ds) => String(ds.deskId) === String(targetDesk.id))
                          .map((ds) => {
                            const svc = state.services.find((s) => String(s.id) === String(ds.serviceId));
                            return svc ? svc.name : null;
                          })
                          .filter(Boolean);

                        return (
                          <div
                            key={targetDesk.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background p-3 hover:border-brand/50 hover:bg-brand/5 transition-all shadow-sm"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <MonitorPlay className="h-4 w-4 text-brand shrink-0" />
                                <span className="font-bold text-sm text-foreground">{targetDesk.label}</span>
                                <span className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                  (targetDesk.isActive ?? true) ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                                )}>
                                  {(targetDesk.isActive ?? true) ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {targetDeskServices.map((name, idx) => (
                                  <span key={idx} className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                                    {name}
                                  </span>
                                ))}
                                {targetDeskServices.length === 0 && (
                                  <span className="text-[10px] text-muted-foreground italic">All services</span>
                                )}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="brand"
                              disabled={isTransferring}
                              onClick={async () => {
                                setIsTransferring(true);
                                try {
                                  await actions.transferTicket(current.id, targetDesk.id);
                                  toast.success(`Transferred Ticket ${current.number} (${current.customerName}) to ${targetDesk.label}!`);
                                  setIsTransferModalOpen(false);
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to transfer ticket");
                                } finally {
                                  setIsTransferring(false);
                                }
                              }}
                              className="shrink-0 text-xs font-semibold"
                            >
                              Transfer Here →
                            </Button>
                          </div>
                        );
                      })}

                    {desks.filter((d) => String(d.id) !== String(desk.id)).length === 0 && (
                      <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-1">
                        <p className="font-bold text-foreground">No other counter desks created in this branch.</p>
                        <p>Create additional operator desks in Branch Operations Setup to enable ticket transfers.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "appointments") {
    // Stats calculation
    const confirmedCount = onlineBookings.filter(b => b.status === "confirmed").length;
    const checkedInCount = onlineBookings.filter(b => b.status === "checked_in").length;
    const completedCount = onlineBookings.filter(b => b.status === "completed").length;

    // Filter calculations
    const filteredBookings = onlineBookings.filter(b => {
      const ref = (b.booking_reference || "").toLowerCase();
      const name = (b.customer_name || "").toLowerCase();
      const phone = (b.customer_phone || "").toLowerCase();
      const query = bookingSearchQuery.toLowerCase();
      const matchesSearch = !query || ref.includes(query) || name.includes(query) || phone.includes(query);

      let matchesStatus = true;
      if (bookingStatusFilter === "confirmed") {
        matchesStatus = b.status === "confirmed";
      } else if (bookingStatusFilter === "checked_in") {
        matchesStatus = b.status === "checked_in";
      } else if (bookingStatusFilter === "completed") {
        matchesStatus = b.status === "completed";
      } else if (bookingStatusFilter === "no_show_or_cancelled") {
        matchesStatus = ["no_show", "cancelled"].includes(b.status);
      }
      
      return matchesSearch && matchesStatus;
    });

    const handleCheckInBooking = async (booking: any) => {
      try {
        await apiFetch(`/api/online-bookings/${booking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "checked_in" })
        });
        toast.success(`Booking ${booking.booking_reference} check-in successful!`);
        fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to check-in booking.");
      }
    };

    const handleCompleteBooking = async (booking: any) => {
      try {
        await apiFetch(`/api/online-bookings/${booking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "completed" })
        });
        toast.success(`Booking ${booking.booking_reference} marked as completed.`);
        fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to complete booking.");
      }
    };

    const handleNoShowBooking = async (booking: any) => {
      try {
        await apiFetch(`/api/online-bookings/${booking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "no_show" })
        });
        toast.success(`Booking ${booking.booking_reference} marked as no-show.`);
        fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to update booking status.");
      }
    };

    const handleCancelBooking = async (booking: any) => {
      try {
        await apiFetch(`/api/online-bookings/${booking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" })
        });
        toast.success(`Booking ${booking.booking_reference} cancelled successfully.`);
        fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to cancel booking.");
      }
    };

    const handleSaveReschedule = async () => {
      if (!rescheduleSlot) {
        toast.error("Please select a time slot.");
        return;
      }
      setIsSavingReschedule(true);
      try {
        await apiFetch(`/api/online-bookings/${rescheduleBooking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({
            date: rescheduleDate,
            slot_time: rescheduleSlot
          })
         });
         toast.success("Appointment rescheduled successfully!");
         setRescheduleBooking(null);
         fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to reschedule booking.");
      } finally {
        setIsSavingReschedule(false);
      }
    };

    const STATUS_BADGES: Record<string, React.ReactNode> = {
      confirmed: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500">Confirmed</span>,
      checked_in: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">Checked In</span>,
      completed: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500">Completed</span>,
      no_show: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500">No Show</span>,
      cancelled: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-500">Cancelled</span>,
    };

    return (
      <div className="space-y-5">
        {/* KPI stats strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="panel p-4 border border-border/80 bg-accent/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Confirmed</span>
            <div className="mt-1 text-lg font-bold text-foreground">{confirmedCount}</div>
          </div>
          <div className="panel p-4 border border-border/80 bg-accent/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Checked-In Waiting</span>
            <div className="mt-1 text-lg font-bold text-foreground">{checkedInCount}</div>
          </div>
          <div className="panel p-4 border border-border/80 bg-accent/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Served Successfully</span>
            <div className="mt-1 text-lg font-bold text-foreground">{completedCount}</div>
          </div>
        </div>

        {/* Filters and search bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-1.5 border border-border rounded-xl p-1 bg-surface w-fit">
            {[
              { id: "all", label: "All Bookings" },
              { id: "confirmed", label: "Confirmed" },
              { id: "checked_in", label: "Checked In" },
              { id: "completed", label: "Completed" },
              { id: "no_show_or_cancelled", label: "No-Show / Cancelled" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setBookingStatusFilter(tab.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  bookingStatusFilter === tab.id
                    ? "bg-brand text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={bookingSearchQuery}
              onChange={(e) => setBookingSearchQuery(e.target.value)}
              placeholder="Search reference, name, phone..."
              className="pl-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* List of bookings */}
        <div className="panel p-0 border border-border/80 overflow-hidden overflow-x-auto">
          {isLoadingBookings ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No online bookings found matching the selected filters.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-accent/20 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Customer Info</th>
                  <th className="p-4">Service Category</th>
                  <th className="p-4">Scheduled Slot</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredBookings.map((b) => {
                  const svcName = state.services.find(s => String(s.id) === String(b.service))?.name || "General/All Services";
                  return (
                    <tr key={b.id} className="hover:bg-accent/5">
                      <td className="p-4 font-mono font-bold text-brand">{b.booking_reference}</td>
                      <td className="p-4">
                        <div className="font-semibold text-foreground">{b.customer_name}</div>
                        <div className="text-muted-foreground mt-0.5">{b.customer_phone} · {b.email}</div>
                      </td>
                      <td className="p-4 font-medium">{svcName}</td>
                      <td className="p-4 font-medium">
                        <div>{b.date}</div>
                        <div className="text-muted-foreground font-mono mt-0.5">{b.slot_time.substring(0, 5)}</div>
                      </td>
                      <td className="p-4">{STATUS_BADGES[b.status] || b.status}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {b.status === "confirmed" && (
                            <>
                              <Button
                                size="sm"
                                variant="brand"
                                className="rounded-lg h-7 text-[10px] px-2.5"
                                onClick={() => handleCheckInBooking(b)}
                              >
                                Check-In
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg h-7 text-[10px] px-2.5"
                                onClick={() => {
                                  setRescheduleBooking(b);
                                  setRescheduleDate(b.date);
                                  setRescheduleSlot(b.slot_time.substring(0, 5));
                                }}
                              >
                                Reschedule
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg h-7 text-[10px] px-2.5 text-rose-500 hover:bg-rose-500/10 border-rose-500/20"
                                onClick={() => handleNoShowBooking(b)}
                              >
                                No-Show
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg h-7 text-[10px] px-2.5 text-gray-500 hover:bg-gray-500/10 border-gray-500/20"
                                onClick={() => handleCancelBooking(b)}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {b.status === "checked_in" && (
                            <>
                              <Button
                                size="sm"
                                variant="brand"
                                className="rounded-lg h-7 text-[10px] px-2.5 flex items-center gap-1"
                                onClick={() => handleCompleteBooking(b)}
                              >
                                Mark Completed
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg h-7 text-[10px] px-2.5 text-rose-500 hover:bg-rose-500/10 border-rose-500/20"
                                onClick={() => handleNoShowBooking(b)}
                              >
                                No-Show
                              </Button>
                            </>
                          )}
                          {!["confirmed", "checked_in"].includes(b.status) && (
                            <span className="text-[10px] text-muted-foreground font-semibold px-2">Processed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Reschedule Modal Dialog */}
        {rescheduleBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="panel max-w-md w-full p-6 border border-border/80 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center border-b border-border/60 pb-3">
                <h3 className="font-display font-bold text-sm">Reschedule Booking {rescheduleBooking.booking_reference}</h3>
                <button
                  onClick={() => setRescheduleBooking(null)}
                  className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select New Date</Label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Time Slot</Label>
                  {isLoadingRescheduleSlots ? (
                    <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Checking slot availability...</div>
                  ) : rescheduleSlots.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                      No slots available on this date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {rescheduleSlots.map((slot) => {
                        const isBooked = slot.status === "fully_booked";
                        const isSelected = rescheduleSlot === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={isBooked}
                            onClick={() => setRescheduleSlot(slot.time)}
                            className={cn(
                              "rounded-lg border p-2 text-center text-[10px] font-semibold transition-all",
                              isBooked
                                ? "border-coral/10 bg-coral/5 text-coral/60 opacity-60 cursor-not-allowed"
                                : isSelected
                                ? "bg-brand/10 border-brand text-brand ring-1 ring-brand font-bold"
                                : "border-border text-foreground bg-accent/5 hover:border-brand/40"
                            )}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                <Button variant="outline" onClick={() => setRescheduleBooking(null)} className="text-xs h-9">
                  Cancel
                </Button>
                <Button
                  variant="brand"
                  disabled={isSavingReschedule || !rescheduleSlot}
                  onClick={handleSaveReschedule}
                  className="text-xs h-9"
                >
                  {isSavingReschedule ? "Saving..." : "Reschedule Appointment"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "desks") {
    const branchServices = state.services.filter((s) => s.branchId === branchId);
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_0.5fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 h-fit">
          {desks.map((d) => {
            const current = tickets.find(
              (t) => t.deskId === d.id && (t.status === "serving" || t.status === "called"),
            );
            const staff = state.staff.find((s) => s.id === d.staffId);
            return (
              <div key={d.id} className="panel p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-bold">{d.label}</h3>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                      d.status === "open"
                        ? "bg-emerald/12 text-emerald"
                        : d.status === "paused"
                          ? "bg-amber/15 text-amber"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {d.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{staff?.name ?? "Unassigned"}</p>
                <div className="mt-4 rounded-xl bg-accent/40 px-4 py-3 text-center">
                  <div className="font-display text-2xl font-bold tabular-nums">
                    {current?.number ?? "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Now serving
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => actions.callNext(d.id)}>
                    Call next
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      actions.setDeskStatus(d.id, d.status === "open" ? "paused" : "open")
                    }
                  >
                    {d.status === "open" ? "Pause" : "Open"}
                  </Button>
                </div>
              </div>
            );
          })}
          {desks.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground col-span-2">No counter desks configured for this branch.</p>
          ) : null}
        </div>

        <div className="panel p-5 h-fit">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Add New Desk Counter
          </h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const label = data.get("label") as string;
            const checkedServices = branchServices.filter(s => data.get(`svc_${s.id}`) === "on").map(s => s.id);

            if (!label) {
              toast.error("Desk label is required.");
              return;
            }

            try {
              await actions.addDesk(branchId, label, checkedServices);
              toast.success("Desk Counter created successfully!");
              form.reset();
            } catch (err: any) {
              toast.error(err.message || "Failed to create desk");
            }
          }} className="space-y-4">
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Desk Label</label>
              <input name="label" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Counter 01, Counter A, etc." required />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Mapped Services</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto border rounded-xl p-3 bg-pearl/40">
                {branchServices.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input type="checkbox" name={`svc_${s.id}`} id={`chk_${s.id}`} className="rounded border-border/80 text-brand" />
                    <label htmlFor={`chk_${s.id}`} className="text-xs text-foreground/80 cursor-pointer">{s.name}</label>
                  </div>
                ))}
                {branchServices.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-2">Create services first</p>
                )}
              </div>
            </div>
            <Button type="submit" variant="brand" className="w-full">Create Desk</Button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "services") {
    const branchServices = state.services.filter((s) => s.branchId === branchId);
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_0.6fr]">
        <div className="panel p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Services List
          </h3>
          <div className="grid gap-3">
            {branchServices.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="font-semibold text-base">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Prefix: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{s.prefix}</span> · Est. Service Time: {s.avgMinutes} min
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={async () => {
                  await actions.removeStaff(s.id); // Or remove service
                  toast.success(`Service ${s.name} deleted`);
                }}>
                  Delete
                </Button>
              </div>
            ))}
            {branchServices.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No services configured for this branch.</p>
            ) : null}
          </div>
        </div>

        <div className="panel p-5 h-fit">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Add New Service
          </h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const name = data.get("name") as string;
            const prefix = data.get("prefix") as string;
            const avgMinutes = parseInt(data.get("avgMinutes") as string, 10);

            if (!name || !prefix) {
              toast.error("Name and Prefix are required.");
              return;
            }

            try {
              await actions.addService(branchId, name, prefix, avgMinutes);
              toast.success("Service added successfully!");
              form.reset();
            } catch (err: any) {
              toast.error(err.message || "Failed to add service");
            }
          }} className="space-y-4">
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Service Name</label>
              <input name="name" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Consultation, Billing, etc." required />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Token Prefix (e.g. A, B)</label>
              <input name="prefix" maxLength={2} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="A" required />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Est. Duration (minutes)</label>
              <input name="avgMinutes" type="number" defaultValue={15} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required />
            </div>
            <Button type="submit" variant="brand" className="w-full">Create Service</Button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "methods") {
    const companyPlan = state.companies[0]?.plan || "starter";
    const packageConfig = planOf(companyPlan);

    const ALL_METHODS = [
      { id: 1, name: "Method 1: Public Walk-in (Self Service)", desc: "Visitors scan QR code to register directly into a single general queue." },
      { id: 2, name: "Method 2: Public Service Selection", desc: "Visitors choose from mapped branch services." },
      { id: 3, name: "Method 3: Live Serving Display Board", desc: "Feeds real-time lobby Serving Boards." },
      { id: 4, name: "Method 4: Remote Slot Booking", desc: "Visitors book appointments remotely verified via SMS." }
    ];

    const visibleMethods = ALL_METHODS.filter((m) => {
      if (m.id === 3 || m.id === 4) {
        return branch?.enabledMethods?.includes(m.id as any) ?? false;
      }
      return true;
    });

    return (
      <div className="grid gap-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Queue Methods Configurations</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {visibleMethods.map((m) => {
            const isUnlocked = packageConfig.methods.includes(m.id as QueueMethod);

            return (
              <div key={m.id} className="panel p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-base">{m.name}</h3>
                    {isUnlocked ? (
                      <span className="bg-emerald/12 text-emerald rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
                        Unlocked
                      </span>
                    ) : (
                      <span className="bg-coral/12 text-coral rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
                        Upgrade Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{m.desc}</p>
                </div>

                <div className="mt-5 space-y-4">
                  {!isUnlocked ? (
                    <div className="bg-pearl/60 border border-border/80 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground font-medium">Your current plan ({companyPlan}) does not include this method.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs font-semibold text-muted-foreground">Status</span>
                        <Button size="sm" variant={branch?.method === m.id ? "brand" : "outline"} onClick={async () => {
                          await actions.setBranchMethod(branchId, m.id as QueueMethod);
                          toast.success(`Method ${m.id} activated successfully!`);
                        }}>
                          {branch?.method === m.id ? "Active" : "Activate"}
                        </Button>
                      </div>

                      {(m.id === 1 || m.id === 2) && (
                        <div className="border-t border-border/60 pt-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground">Touchpoint QR Code</div>
                            <p className="text-[10px] text-muted-foreground mt-1">Branded with your company colors</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="brand" onClick={async () => {
                              try {
                                 const res = await fetch(`/api/branches/${branchId}/generate-qr/`, {
                                   method: "POST",
                                   headers: { "Content-Type": "application/json" },
                                   body: JSON.stringify({ method: String(m.id) })
                                 });
                                 if (!res.ok) throw new Error((await res.json()).error || "Failed to generate QR");
                                 toast.success("QR Code generated successfully!");
                                 window.open(`http://${window.location.hostname}:8000/media/qrcodes/branch_${branchId}_m${m.id}.svg`, "_blank");
                              } catch (err: any) {
                                toast.error(err.message || "Failed to generate QR");
                              }
                            }}>
                              Generate QR
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Waiting" value={<CountUp value={stats.waiting} />} hint={branch.openHours} />
        <StatCard label="Served today" value={<CountUp value={stats.served} />} />
        <StatCard label="Avg wait" value={<CountUp value={Math.round(stats.avgWait)} suffix=" min" />} />
        <StatCard label="Desks open" value={`${stats.desksOpen}/${stats.desksTotal}`} />
      </div>

      <Reveal>
        <div className="panel flex flex-wrap items-center gap-3 p-5">
          <span className="text-sm font-medium">Customer touchpoints</span>
          <Button asChild size="sm" variant="outline">
            <Link to="/q/$branchId" params={{ branchId }}>
              <QrCode className="h-4 w-4" /> Join page
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/display/$branchId" params={{ branchId }}>
              <MonitorPlay className="h-4 w-4" /> Display board
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/kiosk/$branchId" params={{ branchId }} search={{}}>
              Kiosk mode
            </Link>
          </Button>
        </div>
      </Reveal>

      <div className="panel p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Live queue
        </h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {waiting.slice(0, 12).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-accent/40 px-4 py-3"
            >
              <div className="min-w-0">
                <span className="font-display text-lg font-bold tabular-nums">{t.number}</span>
                <span className="ml-2 truncate text-xs text-muted-foreground">
                  {t.customerName}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {state.services.find((s) => s.id === t.serviceId)?.name}
              </span>
            </div>
          ))}
          {waiting.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Queue is clear.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
