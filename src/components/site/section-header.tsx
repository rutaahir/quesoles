import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow: string;
  title: string[];
  lead?: string;
  align?: "left" | "center";
  className?: string;
}

/**
 * Reusable, highly legible, and scroll-animated Section Header component.
 * Features a frosted glass local backdrop, accent vertical bar, bold display text
 * with gradient highlights, and a staggered scroll-triggered entrance.
 */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
}: SectionHeaderProps) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || reduce) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // Trigger animation once
        }
      },
      { threshold: 0.6 } // Trigger when 60% of the header is visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduce]);

  // Empty fallback variants for reduced motion
  const emptyVariants: Variants = {
    hidden: {},
    visible: {},
  };

  // Accent bar animation
  const barVariants: Variants = {
    hidden: { scaleY: 0, originY: 0 },
    visible: { scaleY: 1, transition: { duration: 0.35, ease: "easeOut" } },
  };

  // Eyebrow badge animation
  const eyebrowVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut", delay: 0.12 } },
  };

  // Headline line animation
  const lineVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: "easeOut",
        delay: 0.2 + i * 0.09,
      },
    }),
  };

  // Highlighted word bounce animation
  const wordVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.45,
        ease: [0.34, 1.56, 0.64, 1], // bouncy easeOut
      },
    },
  };

  // Lead paragraph animation
  const leadVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: (totalLines: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        delay: 0.25 + totalLines * 0.09 + 0.15,
      },
    }),
  };

  // Helper to parse title strings for gradient highlighted words enclosed in curly braces e.g., "{highlighted}"
  const renderTitleLine = (line: string, lineIndex: number) => {
    const parts = line.split(/(\{.*?\})/g);

    return (
      <motion.div
        key={lineIndex}
        custom={lineIndex}
        variants={reduce ? emptyVariants : lineVariants}
        className="block"
      >
        {parts.map((part, partIndex) => {
          if (part.startsWith("{") && part.endsWith("}")) {
            const cleanText = part.slice(1, -1);
            return (
              <motion.span
                key={partIndex}
                variants={reduce ? emptyVariants : wordVariants}
                className="text-gradient inline-block font-extrabold"
              >
                {cleanText}
              </motion.span>
            );
          }
          return <span key={partIndex}>{part}</span>;
        })}
      </motion.div>
    );
  };

  const isCentered = align === "center";

  return (
    <motion.div
      ref={containerRef}
      initial={reduce ? "visible" : "hidden"}
      animate={isInView ? "visible" : "hidden"}
      className={cn(
        "relative max-w-4xl border border-white/12 dark:border-white/5 bg-[oklch(0.985_0.006_75_/_0.48)] dark:bg-[oklch(0.19_0.02_280_/_0.48)] backdrop-blur-md rounded-[2.5rem] p-7 sm:p-10 mb-12 shadow-[0_8px_32px_-12px_oklch(0.4_0.05_285_/_0.06)]",
        isCentered ? "mx-auto text-center items-center flex flex-col" : "text-left",
        className
      )}
    >
      <div className={cn("flex gap-5 w-full", isCentered ? "flex-col items-center" : "flex-row items-start")}>
        {/* Accent gradient bar */}
        <motion.div
          variants={reduce ? emptyVariants : barVariants}
          className={cn(
            "rounded-full bg-gradient-to-b from-primary via-violet to-coral shrink-0",
            isCentered ? "w-[40px] h-[4px]" : "w-[4px] h-[54px] mt-1"
          )}
        />

        <div className="flex-1 min-w-0">
          {/* Eyebrow badge */}
          <motion.div
            variants={reduce ? emptyVariants : eyebrowVariants}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary shadow-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            {eyebrow}
          </motion.div>

          {/* Headline Display */}
          <h2 className="mt-5 font-display text-[2.25rem] sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-foreground [text-shadow:_0_1px_2px_oklch(0_0_0_/_3%)]">
            {title.map((line, idx) => renderTitleLine(line, idx))}
          </h2>

          {/* Lead supporting paragraph */}
          {lead && (
            <motion.p
              custom={title.length}
              variants={reduce ? emptyVariants : leadVariants}
              className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl"
            >
              {lead}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
