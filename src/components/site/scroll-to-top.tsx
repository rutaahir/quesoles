import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence, useScroll, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button after scrolling down 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    // Run once initially to check scroll position on load
    toggleVisibility();

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const arrowVariants: Variants = {
    initial: { y: 0 },
    hover: {
      y: [0, -4, 2, 0],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        repeatDelay: 0.4,
        ease: "easeInOut" as const,
      },
    },
    tap: {
      y: -10,
      scale: 0.9,
      transition: {
        duration: 0.2,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 30 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          whileHover={{
            scale: 1.08,
            boxShadow: "var(--shadow-lift)",
          }}
          onClick={scrollToTop}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "flex h-12 w-12 items-center justify-center rounded-full",
            "glass shadow-soft cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "border border-border/80 text-foreground transition-shadow",
          )}
          aria-label="Back to top"
        >
          {/* Progress circle background */}
          <svg className="absolute inset-0 -rotate-90 h-full w-full p-0.5" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              className="stroke-muted-foreground/10"
              strokeWidth="2.5"
              fill="none"
            />
            <motion.circle
              cx="18"
              cy="18"
              r="16"
              stroke="url(#brand-scroll-gradient)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              style={{
                pathLength: scrollYProgress,
              }}
            />
            <defs>
              <linearGradient id="brand-scroll-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                {/* Quesole theme brand colors matching --gradient-brand */}
                <stop offset="0%" stopColor="oklch(0.53 0.17 283)" />
                <stop offset="45%" stopColor="oklch(0.62 0.17 300)" />
                <stop offset="100%" stopColor="oklch(0.72 0.12 220)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Animated Arrow Icon */}
          <motion.div
            variants={arrowVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            className="z-10 flex items-center justify-center text-primary dark:text-primary"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
