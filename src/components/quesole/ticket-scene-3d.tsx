import { useCallback, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import type { MotionValue } from "motion/react";
import { ArrowRight, MonitorPlay, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "serving" | "next" | "waiting";

type Card = {
  id: number;
  token: string;
  counter: string;
  priority: string;
  waited: string;
};

const STATUS_LABEL: Record<Status, string> = {
  serving: "NOW SERVING",
  next: "NEXT IN LINE",
  waiting: "WAITING",
};

function makeCard(prevId: number): Card {
  const seq = prevId + 1;
  return {
    id: seq,
    token: `A${seq}`,
    counter: `Counter 0${(seq % 4) + 1}`,
    priority: seq % 3 === 0 ? "Priority · Senior" : "Standard",
    waited: `${3 + (seq % 7)}m`,
  };
}

const INITIAL: Card[] = [
  { id: 104, token: "A104", counter: "Counter 03", priority: "OPD Consultation", waited: "0m" },
  { id: 105, token: "A105", counter: "Counter 01", priority: "Priority · Senior", waited: "4m" },
  { id: 106, token: "A106", counter: "Counter 02", priority: "Standard", waited: "6m" },
  { id: 107, token: "A107", counter: "Counter 04", priority: "Standard", waited: "9m" },
];

/**
 * Layered CSS-3D "queue ecosystem": floating frosted ticket cards at
 * different depths, cursor parallax/tilt, per-card hover lift and a click
 * interaction that advances the queue exactly like an operator "Call Next".
 */
export function TicketScene3D({
  className,
  parallax,
}: {
  className?: string;
  parallax?: { y?: MotionValue<number>; rotate?: MotionValue<number> };
}) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<Card[]>(INITIAL);
  const [hovered, setHovered] = useState<number | null>(null);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 110, damping: 18, mass: 0.6 });
  const sry = useSpring(ry, { stiffness: 110, damping: 18, mass: 0.6 });

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduce || !wrap.current) return;
      const r = wrap.current.getBoundingClientRect();
      ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
      rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10);
    },
    [reduce, rx, ry],
  );

  const advance = useCallback(() => {
    setCards((prev) => [...prev.slice(1), makeCard(prev[prev.length - 1]!.id)]);
  }, []);

  return (
    <motion.div
      ref={wrap}
      onMouseMove={onMove}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
        setHovered(null);
      }}
      style={{
        ...(parallax?.y ? { y: parallax.y } : {}),
        perspective: 1200,
      }}
      className={cn("relative aspect-4/3 w-full select-none", className)}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          ...(reduce ? {} : { rotateX: srx, rotateY: sry }),
          ...(parallax?.rotate ? { rotateZ: parallax.rotate } : {}),
        }}
      >
        {/* flowing connection lines toward the implied service counter */}
        <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full text-primary/45" aria-hidden>
          <motion.path
            d="M70 250 C 150 250, 150 150, 230 140 S 330 110, 372 118"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="6 8"
            animate={reduce ? {} : { strokeDashoffset: [0, -56] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M60 200 C 140 190, 170 120, 250 96"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 10"
            opacity={0.6}
            animate={reduce ? {} : { strokeDashoffset: [0, -56] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
          />
        </svg>

        {/* implied service counter */}
        <motion.div
          className="glass absolute right-[3%] top-[6%] flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          animate={reduce ? {} : { y: [0, -7, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transform: "translateZ(20px)" }}
        >
          <MonitorPlay className="h-3.5 w-3.5 text-primary" /> Counter desk
          <span className="ml-1 inline-flex items-center gap-1 text-emerald">
            <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-emerald" /> live
          </span>
        </motion.div>

        <motion.div
          className="glass absolute -bottom-[2%] left-[0%] flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium"
          animate={reduce ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Users className="h-3.5 w-3.5 text-primary" /> 32 branches orchestrated live
        </motion.div>

        <AnimatePresence initial={false} mode="popLayout">
          {cards.map((card, i) => {
            const status: Status = i === 0 ? "serving" : i === 1 ? "next" : "waiting";
            const isHovered = hovered === card.id;
            const pushed = hovered !== null && !isHovered;
            return (
              <TicketCard
                key={card.id}
                card={card}
                index={i}
                status={status}
                hovered={isHovered}
                pushed={pushed}
                reduce={!!reduce}
                onHover={() => setHovered(card.id)}
                onClick={advance}
              />
            );
          })}
        </AnimatePresence>
      </motion.div>

      <p className="absolute -bottom-1 right-0 text-[11px] text-muted-foreground">
        Click a ticket to advance the queue
        <ArrowRight className="ml-1 inline h-3 w-3" />
      </p>
    </motion.div>
  );
}

const POS = [
  { left: "2%", top: "46%", scale: 1, z: 90, blur: 0 },
  { left: "44%", top: "12%", scale: 0.84, z: 50, blur: 0.4 },
  { left: "56%", top: "68%", scale: 0.72, z: 20, blur: 0.9 },
  { left: "70%", top: "40%", scale: 0.6, z: 10, blur: 1.4 },
];

function TicketCard({
  card,
  index,
  status,
  hovered,
  pushed,
  reduce,
  onHover,
  onClick,
}: {
  card: Card;
  index: number;
  status: Status;
  hovered: boolean;
  pushed: boolean;
  reduce: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const p = POS[Math.min(index, POS.length - 1)]!;
  const bob = 8 - index * 1.4;
  const dur = 4.4 + index * 0.9;

  return (
    <motion.button
      type="button"
      layout
      onMouseEnter={onHover}
      onClick={onClick}
      initial={{ opacity: 0, scale: p.scale * 0.85, filter: "blur(6px)" }}
      animate={{
        opacity: 1,
        scale: p.scale * (hovered ? 1.05 : pushed ? 0.96 : 1),
        filter: `blur(${p.blur}px)`,
        x: pushed ? (index % 2 === 0 ? -10 : 12) : 0,
        ...(reduce ? {} : { y: [0, -bob, 0], rotate: [-1.2, 1.4, -1.2] }),
      }}
      exit={{ opacity: 0, x: -50, scale: 0.86, filter: "blur(8px)" }}
      transition={{
        layout: { type: "spring", stiffness: 140, damping: 20 },
        opacity: { duration: 0.5 },
        scale: { type: "spring", stiffness: 220, damping: 22 },
        x: { type: "spring", stiffness: 200, damping: 24 },
        y: { duration: dur, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: dur + 1.6, repeat: Infinity, ease: "easeInOut" },
      }}
      style={{
        left: p.left,
        top: p.top,
        zIndex: p.z,
        width: "46%",
        maxWidth: 208,
        transformStyle: "preserve-3d",
        boxShadow:
          status === "serving"
            ? "0 30px 60px -24px color-mix(in oklab, var(--coral) 55%, transparent), 0 8px 20px -12px color-mix(in oklab, var(--primary) 45%, transparent)"
            : "0 22px 44px -26px color-mix(in oklab, var(--primary) 55%, transparent)",
      }}
      className="glass absolute cursor-pointer rounded-3xl p-4 text-left"
      aria-label={`${STATUS_LABEL[status]} ticket ${card.token}. Click to advance the queue.`}
    >
      <StatusPill status={status} waited={card.waited} />
      <div
        className={cn(
          "mt-2 font-display font-bold tracking-tight",
          status === "serving" ? "text-4xl text-gradient" : "text-3xl text-foreground/85",
        )}
      >
        {card.token}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {card.counter} · {card.priority}
      </div>
      {status === "serving" ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-brand"
            animate={reduce ? {} : { width: ["25%", "92%"] }}
            transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
        </div>
      ) : null}
    </motion.button>
  );
}

function StatusPill({ status, waited }: { status: Status; waited: string }) {
  return (
    <motion.span
      layout
      initial={false}
      animate={{
        backgroundColor:
          status === "serving"
            ? "color-mix(in oklab, var(--coral) 92%, transparent)"
            : status === "next"
              ? "color-mix(in oklab, var(--primary) 14%, transparent)"
              : "color-mix(in oklab, var(--muted-foreground) 12%, transparent)",
        color:
          status === "serving"
            ? "var(--coral-foreground)"
            : status === "next"
              ? "var(--primary)"
              : "var(--muted-foreground)",
      }}
      transition={{ duration: 0.5 }}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
    >
      {status === "serving" ? <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-current" /> : null}
      {STATUS_LABEL[status]}
      {status === "waiting" ? ` (${waited})` : ""}
    </motion.span>
  );
}
