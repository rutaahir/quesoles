import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Global background video component that sits fixed behind the screen content,
 * activating only when scrolled past the Hero section.
 * Plays continuously during active scrolling and pauses automatically when idle.
 * Transitions color temperature between warm pearl/ivory and cool ice-blue based on section.
 */
export function ScrollControlledBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [themeMode, setThemeMode] = useState<"warm" | "cool">("warm");
  const shouldReduceMotion = useReducedMotion();
  const timeoutRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  // 1. Observe the Hero section to toggle visibility
  useEffect(() => {
    const hero = document.getElementById("hero-section");
    if (!hero) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(!entry.isIntersecting);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // 2. Observe sections in view to shift color temperature
  useEffect(() => {
    if (!isVisible) return;

    const sections = [
      { id: "how-it-works-section", mode: "warm" },
      { id: "methods-section", mode: "cool" },
      { id: "analytics-section", mode: "cool" },
      { id: "alert-intelligence-section", mode: "cool" },
      { id: "use-cases-section", mode: "warm" },
      { id: "trust-section", mode: "warm" },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sec = sections.find((s) => s.id === entry.target.id);
            if (sec) {
              setThemeMode(sec.mode as "warm" | "cool");
            }
          }
        });
      },
      {
        rootMargin: "-35% 0px -35% 0px", // Trigger when section occupies the central viewport
      }
    );

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isVisible]);

  // 3. Play on scroll / pause when idle
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVisible || shouldReduceMotion) {
      if (video) {
        video.pause();
      }
      return;
    }

    const handleScroll = () => {
      // Clear existing debounce timeout
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      // Play video if it's currently paused
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        video.play().catch((err) => {
          console.warn("Autoplay playback failed or was interrupted:", err);
          isPlayingRef.current = false;
        });
      }

      // Debounce timeout (200ms) to pause the video when scrolling stops
      timeoutRef.current = window.setTimeout(() => {
        if (video && isPlayingRef.current) {
          video.pause();
          isPlayingRef.current = false;
        }
        timeoutRef.current = null;
      }, 200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      if (video) {
        video.pause();
      }
      isPlayingRef.current = false;
    };
  }, [isVisible, shouldReduceMotion]);

  // Reduced motion fallback (solid background or static fallback poster)
  if (shouldReduceMotion) {
    return (
      <div
        className="fixed inset-0 z-0 w-full h-full bg-background"
        style={{ display: isVisible ? "block" : "none" }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-0 w-full h-full overflow-hidden pointer-events-none transition-opacity duration-300"
      style={{
        display: isVisible ? "block" : "none",
      }}
    >
      <video
        ref={videoRef}
        src="/bg.mp4"
        loop
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />
      {/* Semi-transparent overlay scrim (58% opacity background color) with backdrop blur and slow color transition */}
      <div
        className={`absolute inset-0 backdrop-blur-[8px] transition-colors duration-[1000ms] ease-in-out ${
          themeMode === "warm"
            ? "bg-[oklch(0.985_0.006_75_/_0.58)]"
            : "bg-[oklch(0.975_0.01_235_/_0.58)]"
        }`}
      />
    </div>
  );
}
