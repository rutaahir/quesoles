import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell, CheckCircle2, Pause, Play, QrCode, Smartphone, Timer, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Product video" for the hero: a looping 15s motion-graphic reel built from
 * the app's own UI language (scan → token → live position → notify → served).
 * Rendered in-app so it stays crisp, lazy, silent and near-zero weight.
 */
const STEPS = [
  { icon: QrCode, title: "Scan the branch QR", body: "No app, no hardware. The customer points their camera at the desk code." },
  { icon: Smartphone, title: "Token issued instantly", body: "A104 lands on their phone with the service, counter and queue position." },
  { icon: Timer, title: "Live position tracking", body: "Ahead-of-you and estimated wait update in real time as desks call next." },
  { icon: Bell, title: "Smart notification", body: "\"You're next — head to Counter 03\" fires two customers before their turn." },
  { icon: CheckCircle2, title: "Served on time", body: "The desk closes the ticket and the branch analytics update the same second." },
];

const STEP_MS = 3000;

export function DemoReel({ playing = true, className }: { playing?: boolean; className?: string }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!playing || reduce) return;
    const id = setInterval(() => setI((v) => (v + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(id);
  }, [playing, reduce]);

  const step = STEPS[i]!;
  const Icon = step.icon;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-[oklch(0.21_0.03_275)] text-[oklch(0.98_0.005_285)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-primary/40 blur-[90px]" />
        <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-coral/30 blur-[90px]" />
      </div>

      <div className="relative flex h-full flex-col justify-between p-5 sm:p-8">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
          <span>Quesole · customer journey</span>
          <span>{String(i + 1).padStart(2, "0")} / 05</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, filter: "blur(6px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-5"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold sm:text-3xl">{step.title}</div>
              <p className="mt-1 max-w-md text-sm opacity-75">{step.body}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-1.5">
          {STEPS.map((_, k) => (
            <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full bg-white"
                initial={false}
                animate={{ width: k < i ? "100%" : k === i ? "100%" : "0%" }}
                transition={{ duration: k === i && playing && !reduce ? STEP_MS / 1000 : 0.2, ease: "linear" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DemoReelModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [playing, setPlaying] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl border-border bg-surface p-4 sm:p-6"
      >
        <DialogTitle className="sr-only">Quesole 60-second product demo</DialogTitle>
        {open ? <DemoReel playing={playing} /> : null}
        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} aria-label="Close demo">
            <X className="h-4 w-4" /> Close (Esc)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
