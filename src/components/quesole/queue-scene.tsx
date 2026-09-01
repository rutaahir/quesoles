import { useEffect, useState } from "react";
import { motion, useCursorParallax, EASE } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Ticket, Users } from "lucide-react";

/**
 * The hero "queue ecosystem": layered depth built from real UI objects
 * (token, phone, display board, counters) rather than abstract blobs.
 * Everything reacts gently to the cursor and advances over time.
 */
export function QueueScene({ className }: { className?: string }) {
  const { x, y } = useCursorParallax(26);
  const [n, setN] = useState(104);

  useEffect(() => {
    const id = setInterval(() => setN((v) => v + 1), 3800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn("relative aspect-4/3 w-full select-none", className)}>
      {/* Layer 1 — atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-[10%] h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[6%] top-[38%] h-64 w-64 rounded-full bg-violet/18 blur-3xl" />
        <div className="absolute bottom-[6%] left-[30%] h-48 w-56 rounded-full bg-coral/15 blur-3xl" />
      </div>

      {/* Layer 2 — connection paths */}
      <svg
        viewBox="0 0 400 300"
        className="absolute inset-0 h-full w-full text-primary/35"
        aria-hidden
      >
        <motion.path
          d="M60 210 C 140 210, 150 110, 230 110 S 330 70, 360 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: EASE }}
        />
        <motion.circle
          r="3.2"
          fill="currentColor"
          animate={{ offsetDistance: ["0%", "100%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{
            offsetPath:
              "path('M60 210 C 140 210, 150 110, 230 110 S 330 70, 360 90')",
          }}
        />
      </svg>

      {/* Layer 3 — the token */}
      <motion.div
        style={{ x, y }}
        className="absolute left-[4%] top-[46%] w-[46%] max-w-[240px]"
      >
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [-1.4, 1, -1.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="glass rounded-3xl p-5"
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Ticket className="h-3.5 w-3.5" /> Your token
          </div>
          <div className="mt-2 font-display text-5xl font-bold tracking-tight text-gradient">
            A{n + 3}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-muted/70 px-3 py-2">
              <div className="text-muted-foreground">Ahead</div>
              <div className="font-semibold">3 people</div>
            </div>
            <div className="rounded-xl bg-muted/70 px-3 py-2">
              <div className="text-muted-foreground">Wait</div>
              <div className="font-semibold">06:42</div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Layer 3b — display board */}
      <motion.div
        style={{ x: useNegate(x), y: useNegate(y) }}
        className="absolute right-[2%] top-[8%] w-[54%] max-w-[280px]"
      >
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="panel overflow-hidden rounded-3xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5" /> Now serving
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald">
              <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-emerald" /> live
            </span>
          </div>
          <div className="bg-brand px-4 py-5 text-primary-foreground">
            <div className="font-display text-4xl font-bold tabular-nums">A{n}</div>
            <div className="text-xs opacity-85">Counter 03 · OPD Consultation</div>
          </div>
          <ul className="divide-y divide-border text-sm">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2">
                <span className="font-mono tabular-nums">A{n + i}</span>
                <span className="text-xs text-muted-foreground">Counter 0{i}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>

      {/* Layer 4 — phone */}
      <motion.div
        style={{ x, y: useNegate(y, 0.5) }}
        className="absolute bottom-[2%] right-[14%] w-[34%] max-w-[168px]"
      >
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [2, -1.5, 2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="panel rounded-[26px] p-3"
        >
          <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-border" />
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Smartphone className="h-3 w-3" /> Live
          </div>
          <div className="mt-1 font-display text-2xl font-bold">You're next</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-brand"
              animate={{ width: ["30%", "88%"] }}
              transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", ease: EASE }}
            />
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Head to Counter 03 in ~2 min
          </div>
        </motion.div>
      </motion.div>

      {/* Layer 5 — counter chip */}
      <motion.div
        style={{ x: useNegate(x, 0.6), y }}
        className="absolute left-[30%] top-[10%] hidden sm:block"
      >
        <div className="glass flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium">
          <Users className="h-3.5 w-3.5 text-primary" />
          32 branches orchestrated live
        </div>
      </motion.div>
    </div>
  );
}

import { useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
function useNegate(v: MotionValue<number>, k = 1) {
  return useTransform(v, (n) => -n * k);
}
