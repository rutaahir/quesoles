import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  animate,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export const EASE = [0.22, 1, 0.36, 1] as const;

export const DUR = {
  micro: 0.14,
  normal: 0.28,
  emphasis: 0.52,
  cinematic: 1.0,
} as const;

/** Fade + rise into view. The single reveal primitive used site-wide. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px -8% 0px" });
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;

  return (
    <Comp
      ref={ref}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : reduce ? { opacity: 1 } : { opacity: 0, y }}
      transition={{ duration: DUR.emphasis, ease: EASE, delay }}
      className={className}
    >
      {children}
    </Comp>
  );
}

/** Animated number transition for live metrics. */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  duration = 0.7,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce, duration]);

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {display.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/** Departure-board style flip for token numbers. */
export function FlipNumber({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cn("inline-flex overflow-hidden", className)}>
      {value.split("").map((ch, i) => (
        <span key={`${i}-${ch}`} className="relative inline-block overflow-hidden">
          <motion.span
            key={ch}
            initial={reduce ? false : { rotateX: -90, opacity: 0, y: "-40%" }}
            animate={{ rotateX: 0, opacity: 1, y: 0 }}
            transition={{ duration: DUR.emphasis, ease: EASE, delay: i * 0.04 }}
            className="inline-block"
            style={{ transformOrigin: "50% 100%" }}
          >
            {ch}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Button wrapper with a subtle magnetic pull toward the cursor. */
export function Magnetic({
  children,
  className,
  strength = 14,
  ...rest
}: { children: ReactNode; strength?: number } & ComponentPropsWithoutRef<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 });
  const sy = useSpring(y, { stiffness: 260, damping: 18 });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      style={reduce ? {} : { x: sx, y: sy }}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
        y.set(((e.clientY - r.top) / r.height - 0.5) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className={cn("inline-block", className)}
      onClick={rest.onClick as never}
    >
      {children}
    </motion.div>
  );
}

/** Card that tilts in 3D toward the cursor. */
export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * max * 2);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * max * 2);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={
        reduce
          ? {}
          : { rotateX: srx, rotateY: sry, transformPerspective: 900, transformStyle: "preserve-3d" }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Cursor-reactive parallax wrapper for layered scenes. */
export function useCursorParallax(depth = 20) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 90, damping: 20 });
  const sy = useSpring(y, { stiffness: 90, damping: 20 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      x.set((e.clientX / window.innerWidth - 0.5) * depth);
      y.set((e.clientY / window.innerHeight - 0.5) * depth);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [depth, reduce, x, y]);

  return { x: sx, y: sy };
}

export { motion, AnimatePresence, useTransform, useReducedMotion };
