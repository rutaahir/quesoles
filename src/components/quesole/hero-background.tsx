import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Layered, living hero background:
 * 1. warm ivory base  2. drifting ambient glows  3. faint dot texture
 * 4. slowly floating brand-coloured particles.
 * Purely decorative — sits behind every hero layer.
 */
export function HeroBackground({ className, showSolid = true }: { className?: string; showSolid?: boolean }) {
  const reduce = useReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const palette = ["var(--primary)", "var(--violet)", "var(--coral)"];
        return {
          id: i,
          left: `${(i * 137.5) % 96}%`,
          top: `${(i * 61.8) % 88}%`,
          size: 4 + ((i * 7) % 9),
          color: palette[i % 3]!,
          duration: 15 + ((i * 3) % 11),
          delay: -(i * 1.7),
          rx: 18 + ((i * 5) % 26),
          ry: 14 + ((i * 9) % 30),
        };
      }),
    [],
  );

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {/* 1 — base */}
      {showSolid && <div className="absolute inset-0 bg-[oklch(0.985_0.006_75)]" />}

      {/* 2 — ambient glows */}
      <motion.div
        className="absolute -right-[12%] -top-[18%] h-[38rem] w-[38rem] rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 55%, transparent), transparent 70%)",
          opacity: 0.22,
        }}
        animate={reduce ? {} : { x: [0, 38, -14, 0], y: [0, -26, 20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-[22%] -left-[14%] h-[34rem] w-[34rem] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, oklch(0.72 0.12 210) 60%, transparent), transparent 70%)",
          opacity: 0.17,
        }}
        animate={reduce ? {} : { x: [0, -30, 22, 0], y: [0, 24, -18, 0] }}
        transition={{ duration: 31, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[38%] top-[30%] h-[26rem] w-[26rem] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--violet) 45%, transparent), transparent 70%)",
          opacity: 0.14,
        }}
        animate={reduce ? {} : { x: [0, 26, -20, 0], y: [0, -18, 16, 0] }}
        transition={{ duration: 23, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 3 — texture */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.05,
          backgroundImage:
            "radial-gradient(currentColor 1px, transparent 1.1px)",
          backgroundSize: "22px 22px",
          color: "oklch(0.35 0.05 285)",
          maskImage: "radial-gradient(80% 70% at 50% 40%, black, transparent 100%)",
        }}
      />

      {/* 4 — particles */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: 0.35,
            filter: "blur(0.5px)",
            boxShadow: `0 0 ${p.size * 3}px color-mix(in oklab, ${p.color} 60%, transparent)`,
          }}
          animate={
            reduce
              ? {}
              : {
                  x: [0, p.rx, 0, -p.rx, 0],
                  y: [0, -p.ry, -p.ry * 1.6, -p.ry, 0],
                  opacity: [0.2, 0.45, 0.28, 0.5, 0.2],
                }
          }
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
