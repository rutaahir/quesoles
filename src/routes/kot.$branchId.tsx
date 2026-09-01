import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle2,
  Headset, Lock, LogOut, Mail, MessageSquare, Phone,
  Settings, ShieldCheck, Sparkles, User, Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { useQuesole, apiFetch } from "@/lib/quesole/store";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kot/$branchId")({
  head: () => ({
    meta: [
      { title: "KOT Check-In — SMS / WhatsApp Token" },
      { name: "description", content: "Walk-in SMS/WhatsApp digital token check-in powered by Quesole." },
    ],
  }),
  component: KotScreen,
});

type ScreenState = "locked" | "form" | "confirmation";

function SegmentedPin({ length = 4, value, onChange, error }: { length?: number; value: string; onChange: (v: string) => void; error: boolean }) {
  const digits = value.split("").slice(0, length);
  while (digits.length < length) digits.push("");
  const focus = (idx: number) => document.getElementById(`kot-pin-${idx}`)?.focus();
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      if (digits[idx]) { onChange(digits.map((d, i) => (i === idx ? "" : d)).join("")); }
      else if (idx > 0) { onChange(digits.map((d, i) => (i === idx - 1 ? "" : d)).join("")); focus(idx - 1); }
      e.preventDefault();
    } else if (e.key >= "0" && e.key <= "9") {
      onChange(digits.map((d, i) => (i === idx ? e.key : d)).join("").slice(0, length));
      if (idx < length - 1) focus(idx + 1);
      e.preventDefault();
    }
  };
  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, idx) => (
        <input key={idx} id={`kot-pin-${idx}`} type="password" inputMode="numeric" maxLength={1} value={d}
          onClick={() => focus(idx)} onKeyDown={(e) => handleKeyDown(e, idx)} onChange={() => {}}
          className={cn(
            "w-14 h-14 rounded-2xl border-2 text-center text-2xl font-black transition-all outline-none bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm",
            error ? "border-destructive text-destructive"
              : d ? "border-primary text-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]"
              : "border-border/60 text-foreground focus:border-primary"
          )} />
      ))}
    </div>
  );
}

function KotScreen() {
  const { branchId } = Route.useParams();
  const { state, actions } = useQuesole();
  const branch = state.branches.find((b) => String(b.id) === String(branchId) || b.slug === branchId);
  const company = state.companies.find((c) => String(c.id) === String(branch?.companyId));
  const services = state.services.filter((s) => String(s.branchId) === String(branch?.id ?? branchId) && s.isActive !== false);

  const [screen, setScreen] = useState<ScreenState>("locked");
  const [pin, setPin] = useState(""); const [pinError, setPinError] = useState<string | null>(null); const [isUnlocking, setIsUnlocking] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false); const [exitPin, setExitPin] = useState(""); const [exitPinError, setExitPinError] = useState<string | null>(null);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState(""); const [note, setNote] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(""); const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [formError, setFormError] = useState<string | null>(null); const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedChannel, setConfirmedChannel] = useState<"sms" | "whatsapp">("sms"); const [confirmedPhone, setConfirmedPhone] = useState("");

  const enabledMethods = (branch?.enabledMethods || []).map(Number);
  const hasSms = enabledMethods.includes(3); const hasWhatsapp = enabledMethods.includes(4);
  const isKotEnabled = hasSms || hasWhatsapp; const bothEnabled = hasSms && hasWhatsapp;
  const isServiceMode = branch?.mode === "SERVICE_BASED";

  useEffect(() => { if (hasSms) setChannel("sms"); else if (hasWhatsapp) setChannel("whatsapp"); }, [hasSms, hasWhatsapp]);
  useEffect(() => { if (services.length > 0 && !selectedServiceId) setSelectedServiceId(services[0]?.id ?? ""); }, [services, selectedServiceId]);
  useEffect(() => {
    if (screen !== "confirmation") return;
    const t = setTimeout(() => resetToForm(), (branch?.kioskIdleTimeoutSeconds || 8) * 1000);
    return () => clearTimeout(t);
  }, [screen]);

  if (state.branches.length === 0) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">Loading KOT system…</p>
      </div>
    </div>
  );

  if (!branch) throw notFound();

  if (!isKotEnabled) return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground select-none overflow-hidden">
      <BgDecoration />
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        <div className="glass w-full max-w-[460px] p-10 rounded-[2rem] space-y-5 text-center shadow-lift">
          <div className="flex justify-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20"><AlertCircle className="h-7 w-7" /></div></div>
          <h2 className="font-display text-2xl font-bold text-foreground">KOT Delivery Disabled</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">SMS / WhatsApp token delivery is not enabled for <strong className="text-foreground">{branch.name}</strong>. Contact your administrator.</p>
        </div>
      </main>
    </div>
  );

  const resetToForm = () => {
    setScreen("form"); setName(""); setPhone(""); setEmail(""); setNote(""); setFormError(null);
    if (hasSms) setChannel("sms"); else if (hasWhatsapp) setChannel("whatsapp");
  };

  const handleUnlock = async () => {
    setPinError(null); if (pin.length < 4) return; setIsUnlocking(true);
    try {
      const res = await apiFetch(`/api/branches/${branch.id}/verify-kiosk-password/`, { method: "POST", body: JSON.stringify({ password: pin }) });
      if (res.verified) { setScreen("form"); setPin(""); toast.success("KOT screen unlocked!"); }
      else { setPinError(res.error || "Incorrect PIN. Please try again."); setPin(""); }
    } catch (err: any) { setPinError(err.message || "Incorrect PIN or access is temporarily locked."); setPin(""); }
    finally { setIsUnlocking(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null);
    if (!name.trim()) { setFormError("Please enter your name."); return; }
    if (!phone.trim() || phone.trim().length < 6) { setFormError("Please enter a valid mobile number."); return; }
    if (email.trim() && !email.includes("@")) { setFormError("Please enter a valid email address."); return; }
    if (isServiceMode && services.length > 0 && !selectedServiceId) { setFormError("Please select a service."); return; }
    setIsSubmitting(true);
    try {
      await actions.joinQueue({
        branchId: branch.id,
        serviceId: isServiceMode ? (selectedServiceId || services[0]?.id || "") : "",
        customerName: name.trim(), contact: phone.trim(), channel,
        ...(email.trim() ? { customerEmail: email.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setConfirmedChannel(channel); setConfirmedPhone(phone.trim()); setScreen("confirmation");
    } catch (err: any) { setFormError(err.message || "Failed to create ticket. Please try again."); }
    finally { setIsSubmitting(false); }
  };

  const handleStaffExit = async (e: React.FormEvent) => {
    e.preventDefault(); setExitPinError(null);
    try {
      const res = await apiFetch(`/api/branches/${branch.id}/verify-kiosk-password/`, { method: "POST", body: JSON.stringify({ password: exitPin }) });
      if (res.verified) { setIsStaffOpen(false); setScreen("locked"); setPin(""); setExitPin(""); toast.success("KOT screen locked."); }
      else { setExitPinError(res.error || "Incorrect password."); setExitPin(""); }
    } catch (err: any) { setExitPinError(err.message || "Incorrect password."); setExitPin(""); }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground select-none overflow-hidden font-sans">
      <BgDecoration />
      <header className="absolute top-0 w-full z-20 flex items-center justify-between px-6 md:px-12 py-7 pointer-events-none">
        <div className="flex items-center gap-4">
          {company?.logoUrl
            ? <img src={company.logoUrl} alt={company.name} className="h-11 w-11 object-contain rounded-2xl shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-1 border border-border/40" />
            : <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand font-bold text-white text-xl shadow-md">{company?.name?.[0] || "Q"}</div>
          }
          <div className="pointer-events-auto flex flex-col">
            <div className="font-display text-xl font-bold tracking-tight text-foreground leading-none">{company?.name || "Quesole"}</div>
            <div className="text-[11px] font-semibold text-muted-foreground lowercase flex gap-1 mt-0.5">{branch.name} <span className="text-primary/60">•</span> {branch.city}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="hidden md:flex items-center gap-2 rounded-full bg-primary/8 border border-primary/15 px-4 py-2 text-[11px] font-bold text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            {bothEnabled ? "SMS & WhatsApp" : hasSms ? "SMS Delivery" : "WhatsApp Delivery"}
          </div>
          {screen !== "locked" && (
            <button onClick={() => { setExitPin(""); setExitPinError(null); setIsStaffOpen(true); }} className="flex h-9 w-9 items-center justify-center rounded-xl glass text-muted-foreground hover:text-foreground transition-all" title="Staff Controls">
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12 pt-28 pb-32">
        <AnimatePresence mode="wait">

          {screen === "locked" && (
            <motion.div key="locked" initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.03, y: -6 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[420px] glass rounded-[2rem] p-10 shadow-lift space-y-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative flex items-center justify-center h-22 w-22">
                    <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.18, 0.05] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 rounded-full bg-primary/20" />
                    <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.22, 0.08] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }} className="absolute inset-2 rounded-full bg-violet/20" />
                    <motion.div animate={pinError ? { x: [-8, 8, -8, 8, 0] } : {}} transition={pinError ? { duration: 0.35 } : {}}
                      className={cn("relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl shadow-md transition-colors", pinError ? "bg-destructive text-destructive-foreground" : "bg-brand text-white")}>
                      <MessageSquare className="h-6 w-6" />
                    </motion.div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 border border-primary/15 px-3 py-0.5 text-[10px] font-bold text-primary uppercase tracking-widest">KOT Check-In</div>
                  <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">KOT Check-In Locked</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">Enter the PIN to unlock <strong className="text-foreground">SMS / WhatsApp</strong> digital token check-in for <strong className="text-foreground">{branch.name}</strong>.</p>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleUnlock(); }} className="space-y-5">
                <div className="space-y-4 flex flex-col items-center">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground self-start ml-1">Enter 4-Digit PIN</Label>
                  <SegmentedPin length={4} value={pin} onChange={(v) => { setPinError(null); setPin(v); }} error={!!pinError} />
                  {pinError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-semibold text-center">{pinError}</motion.p>}
                </div>
                <Button type="submit" disabled={pin.length < 4 || isUnlocking} className="w-full h-13 text-base font-bold rounded-xl shadow-md active:scale-[0.98] bg-brand hover:opacity-90 text-white border-0 gap-2">
                  <MessageSquare className="h-4 w-4 opacity-80" />
                  {isUnlocking ? "Verifying…" : "Unlock KOT Check-In"}
                  <ArrowRight className="h-4 w-4 opacity-70 ml-0.5" />
                </Button>
              </form>
            </motion.div>
          )}

          {screen === "form" && (
            <motion.div key="form" initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.03, y: -6 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-3xl relative">
              <div className="absolute top-8 left-8 z-20">
                <Button type="button" variant="ghost" onClick={() => setScreen("locked")} className="text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wider gap-2 rounded-xl px-3 h-9"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
              </div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-brand shadow-md text-white"><MessageSquare className="h-7 w-7" /></div>
              </div>
              <form onSubmit={handleSubmit} className="pt-16 pb-10 px-8 md:px-10 space-y-6 glass rounded-[2rem] shadow-lift relative">
                <div className="text-center space-y-1.5">
                  <div className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center justify-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary inline-block" /> Digital Token Check-In <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                  </div>
                  <h1 className="font-display text-4xl md:text-5xl font-black text-gradient tracking-tight">Welcome!</h1>
                  <p className="text-sm text-muted-foreground">Fill in your details — your queue token will be sent directly to your phone.</p>
                </div>
                {formError && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 rounded-xl border border-destructive/25 bg-destructive/8 p-3.5 text-sm font-semibold text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" /><span>{formError}</span>
                  </motion.div>
                )}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 group">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 group-focus-within:text-primary transition-colors">Full Name *</Label>
                    <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" required className="pl-10 h-11 rounded-xl bg-background/60 focus-visible:ring-primary/30 font-medium" /></div>
                  </div>
                  <div className="space-y-1.5 group">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 group-focus-within:text-primary transition-colors">Mobile Number *</Label>
                    <div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                      <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" required className="pl-10 h-11 rounded-xl bg-background/60 focus-visible:ring-primary/30 font-mono text-sm" />
                      {phone.length >= 6 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"><CheckCircle2 className="h-4 w-4" /></motion.div>}
                    </div>
                  </div>
                  <div className="space-y-1.5 group">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 group-focus-within:text-primary transition-colors">Email (Optional)</Label>
                    <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. rahul@example.com" className="pl-10 h-11 rounded-xl bg-background/60 focus-visible:ring-primary/30 font-medium" /></div>
                  </div>
                  <div className="space-y-1.5 group">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 group-focus-within:text-primary transition-colors">Note (Optional)</Label>
                    <div className="relative"><MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Urgent inquiry" className="pl-10 h-11 rounded-xl bg-background/60 focus-visible:ring-primary/30 font-medium" /></div>
                  </div>
                  {bothEnabled ? (
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Token Delivery Method *</Label>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setChannel("sms")} className={cn("flex-1 h-11 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer", channel === "sms" ? "border-primary bg-primary/8 text-primary" : "border-border bg-background/40 text-muted-foreground hover:bg-accent")}>
                          <Phone className="h-4 w-4" /> SMS Token
                        </button>
                        <button type="button" onClick={() => setChannel("whatsapp")} className={cn("flex-1 h-11 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer", channel === "whatsapp" ? "border-primary bg-primary/8 text-primary" : "border-border bg-background/40 text-muted-foreground hover:bg-accent")}>
                          <MessageSquare className="h-4 w-4" /> WhatsApp Token
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-1 md:col-span-2 flex items-center gap-3 text-[11px] font-semibold text-primary bg-primary/6 border border-primary/15 rounded-xl p-3">
                      <MessageSquare className="h-4 w-4 shrink-0" />Your queue token will be delivered via {hasSms ? "SMS" : "WhatsApp"} to your mobile number.
                    </div>
                  )}
                  {isServiceMode && services.length > 0 && (
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Select Service *</Label>
                      <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} required className="w-full h-11 px-4 rounded-xl border border-border bg-background/60 font-medium text-sm outline-none appearance-none focus:ring-1 focus:ring-primary/30">
                        {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.prefix})</option>)}
                      </select>
                    </div>
                  )}
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-lg font-black rounded-xl shadow-md active:scale-[0.98] bg-brand hover:opacity-90 text-white border-0 gap-3">
                    <Sparkles className="h-5 w-5" />
                    {isSubmitting ? "Sending your token…" : `Get My ${channel === "sms" ? "SMS" : "WhatsApp"} Token`}
                    <ArrowRight className="h-4 w-4 opacity-80 ml-1" />
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          )}

          {screen === "confirmation" && (
            <motion.div key="confirmation" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.06 }} transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[480px] text-center glass rounded-[2rem] p-12 shadow-lift space-y-7">
              <div className="flex justify-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} className="relative flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-breathe" />
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 350, damping: 14, delay: 0.18 }} className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand shadow-md">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </motion.div>
                </motion.div>
              </div>
              <div className="space-y-3">
                <h2 className="font-display text-4xl font-black tracking-tight text-gradient">Token Sent!</h2>
                <p className="text-base font-medium text-muted-foreground leading-relaxed">
                  Your queue token has been sent to your <strong className="text-foreground">{confirmedChannel === "sms" ? "SMS" : "WhatsApp"}</strong>.<br />
                  <span className="font-mono text-sm text-foreground/80">{confirmedPhone}</span>
                </p>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 border border-primary/15 px-5 py-2 text-sm font-bold text-primary">
                  <MessageSquare className="h-4 w-4" />Check your {confirmedChannel === "sms" ? "messages" : "WhatsApp"} for token &amp; queue position
                </div>
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Screen resets automatically for the next customer…</p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="absolute bottom-5 w-full z-20 px-6 md:px-12 pointer-events-none flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-5 md:gap-8 glass rounded-full px-7 py-3.5 shadow-soft pointer-events-auto">
          {[{ icon: ShieldCheck, label: "Secure Access", sub: "Protected by branch PIN" }, { icon: MessageSquare, label: "SMS & WhatsApp", sub: "Token sent to your phone" }, { icon: Wifi, label: "No Screen Required", sub: "Track queue on your phone" }, { icon: Headset, label: "Need Help?", sub: "Contact your administrator" }].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 rounded-xl bg-primary/8 text-primary items-center justify-center"><Icon className="h-3.5 w-3.5" /></div>
              <div className="text-left leading-tight"><div className="text-[11px] font-bold text-foreground">{label}</div><div className="text-[9px] text-muted-foreground font-medium">{sub}</div></div>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground/50 font-medium">&copy; {new Date().getFullYear()} Quesole Technologies Pvt. Ltd.</div>
      </footer>

      {isStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm glass rounded-2xl p-6 shadow-lift space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">Staff — Lock KOT Screen</h3></div>
              <button onClick={() => setIsStaffOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={handleStaffExit} className="space-y-4">
              {exitPinError && <div className="rounded-xl border border-destructive/25 bg-destructive/8 p-3 text-xs text-destructive font-semibold">{exitPinError}</div>}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Enter KOT Screen PIN *</Label>
                <Input type="password" value={exitPin} onChange={(e) => setExitPin(e.target.value)} placeholder="Enter PIN" autoFocus required className="mt-1.5 font-mono text-center text-lg rounded-xl h-11 tracking-widest bg-background/60" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsStaffOpen(false)} className="text-xs rounded-xl">Cancel</Button>
                <Button type="submit" variant="brand" className="text-xs gap-1.5 rounded-xl"><LogOut className="h-4 w-4" /> Lock &amp; Return</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function BgDecoration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-60 -right-40 h-[700px] w-[700px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, oklch(0.53 0.17 283 / 0.18) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-60 -left-40 h-[600px] w-[600px] rounded-full opacity-25" style={{ background: "radial-gradient(circle, oklch(0.62 0.17 300 / 0.15) 0%, transparent 70%)" }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, oklch(0.72 0.12 220 / 0.12) 0%, transparent 70%)" }} />
      <div className="absolute inset-0 grid-faint opacity-60" />
      <motion.div animate={{ y: [0, -18, 0], rotate: [0, 3, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-28 right-12 h-36 w-36 rounded-3xl border border-primary/10 bg-primary/4" />
      <motion.div animate={{ y: [0, -12, 0], rotate: [0, -2, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.5 }} className="absolute top-44 left-10 h-24 w-24 rounded-2xl border border-violet/10 bg-violet/4" />
    </div>
  );
}
