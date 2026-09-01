import { motion } from "motion/react";
import { Bell, Check, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared frosted "glass" ticket card — same visual language as the hero scene. */
export function GlassTicket({
  status,
  statusTone = "indigo",
  token,
  meta,
  className,
}: {
  status: string;
  statusTone?: "indigo" | "coral" | "neutral" | "success";
  token: string;
  meta?: string;
  className?: string;
}) {
  const tone =
    statusTone === "coral"
      ? "bg-coral text-white"
      : statusTone === "success"
        ? "bg-emerald-500 text-white"
        : statusTone === "neutral"
          ? "bg-white/15 text-white/80"
          : "bg-primary text-primary-foreground";

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/25 bg-white/12 p-4 text-white shadow-[0_18px_40px_-18px_oklch(0.5_0.2_285/0.8)] backdrop-blur-md",
        className,
      )}
    >
      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]", tone)}>
        {status}
      </span>
      <div className="mt-2 font-display text-3xl font-bold leading-none">{token}</div>
      {meta ? <div className="mt-1 text-[11px] opacity-70">{meta}</div> : null}
    </div>
  );
}

/** Simplified phone shell. */
export function Phone({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative h-[210px] w-[118px] shrink-0 overflow-hidden rounded-[22px] border border-white/25 bg-[oklch(0.16_0.03_275)] p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] sm:h-[250px] sm:w-[140px]",
        className,
      )}
    >
      <div className="absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full bg-white/25" />
      <div className="mt-3 flex h-[calc(100%-0.75rem)] flex-col">{children}</div>
    </div>
  );
}

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] as const },
});

function QrGlyph({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-white p-2", className)}>
      <QrCode className="h-full w-full text-[oklch(0.2_0.03_275)]" strokeWidth={1.4} />
      <motion.div
        className="absolute inset-x-0 h-6 bg-gradient-to-b from-transparent via-emerald-400/60 to-transparent"
        initial={{ top: "-15%" }}
        animate={{ top: ["-15%", "100%"] }}
        transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.8 }}
      />
    </div>
  );
}

/** 1 — Customer scans the branch QR from a kiosk/counter surface. */
export function SceneScan() {
  return (
    <div className="flex items-end gap-5 sm:gap-8">
      <motion.div {...fade(0)} className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
        <QrGlyph className="h-24 w-24 sm:h-28 sm:w-28" />
        <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
          Counter kiosk
        </div>
      </motion.div>
      <motion.div {...fade(0.12)}>
        <Phone>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-white">
            <div className="relative rounded-md border-2 border-emerald-400/70 p-1.5">
              <QrCode className="h-10 w-10 opacity-80" strokeWidth={1.4} />
            </div>
            <div className="text-[10px] opacity-70">Scanning…</div>
          </div>
        </Phone>
      </motion.div>
    </div>
  );
}

/** 2 — Token issued on the phone. */
export function SceneToken() {
  return (
    <motion.div {...fade(0)} className="flex items-center gap-5 sm:gap-8">
      <Phone>
        <div className="flex flex-1 flex-col items-center justify-center px-1.5">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.15 }}
            className="w-full"
          >
            <GlassTicket status="Issued" statusTone="indigo" token="A118" meta="General enquiry · Desk 03" className="p-3" />
          </motion.div>
        </div>
      </Phone>
      <motion.div {...fade(0.3)} className="hidden text-sm opacity-75 sm:block">
        Token <span className="font-semibold opacity-100">A118 issued</span>
        <div className="opacity-70">No app install, no paper slip.</div>
      </motion.div>
    </motion.div>
  );
}

/** 3 — Live position tracking. */
export function SceneTracking() {
  return (
    <motion.div {...fade(0)} className="flex items-center gap-5 sm:gap-8">
      <Phone>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center text-white">
          <div className="font-display text-4xl font-bold leading-none">A118</div>
          <div className="text-[11px] opacity-75">7 people ahead</div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-coral"
              initial={{ width: "18%" }}
              animate={{ width: ["18%", "46%"] }}
              transition={{ duration: 2.4, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.5)]"
              initial={{ left: "14%" }}
              animate={{ left: ["14%", "42%"] }}
              transition={{ duration: 2.4, ease: "easeInOut" }}
            />
          </div>
          <div className="text-[10px] opacity-60">Est. wait ~11 min</div>
        </div>
      </Phone>
      <motion.div {...fade(0.25)} className="hidden text-sm opacity-75 sm:block">
        Live position updates
        <div className="opacity-70">Every desk action re-computes the wait.</div>
      </motion.div>
    </motion.div>
  );
}

/** 4 — Notification banner slides down over the phone screen. */
export function SceneNotify() {
  return (
    <motion.div {...fade(0)} className="flex items-center gap-5 sm:gap-8">
      <Phone>
        <div className="relative flex flex-1 flex-col items-center justify-center gap-2 px-2 text-center text-white">
          <div className="font-display text-4xl font-bold leading-none opacity-40">A118</div>
          <div className="text-[11px] opacity-40">1 person ahead</div>
          <motion.div
            initial={{ y: -70, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="absolute inset-x-0 top-0"
          >
            <motion.div
              animate={{ boxShadow: ["0 0 0 0 rgba(255,120,90,0.0)", "0 0 22px 4px rgba(255,120,90,0.45)", "0 0 0 0 rgba(255,120,90,0.0)"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-start gap-2 rounded-xl border border-white/25 bg-white/15 p-2 text-left backdrop-blur-md"
            >
              <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" />
              <div className="text-[10px] leading-tight">
                <div className="font-semibold">You&apos;re next</div>
                <div className="opacity-75">Proceed to Counter 03</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </Phone>
      <motion.div {...fade(0.3)} className="hidden text-sm opacity-75 sm:block">
        Smart notification
        <div className="opacity-70">Fires two customers before their turn.</div>
      </motion.div>
    </motion.div>
  );
}

/** 5 — Counter side: ticket completes and clears. */
export function SceneServed() {
  return (
    <motion.div {...fade(0)} className="flex items-center gap-5 sm:gap-8">
      <div className="relative h-[130px] w-[190px]">
        <motion.div
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: [1, 1, 0], y: [0, -6, -34], scale: [1, 1.02, 0.94] }}
          transition={{ duration: 2.2, times: [0, 0.55, 1], ease: "easeInOut" }}
          className="absolute inset-x-0 top-0"
        >
          <GlassTicket status="Completed" statusTone="success" token="A118" meta="Counter 03 · 4m 12s" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, type: "spring", stiffness: 280, damping: 15 }}
          className="absolute bottom-0 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.5)]"
        >
          <Check className="h-7 w-7" strokeWidth={3} />
        </motion.div>
      </div>
      <motion.div {...fade(0.35)} className="hidden text-sm opacity-75 sm:block">
        Served on time
        <div className="opacity-70">Analytics update the same second.</div>
      </motion.div>
    </motion.div>
  );
}
