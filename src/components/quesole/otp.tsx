import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";

/** Deterministic demo code so testers are never blocked. */
export const DEMO_OTP = "418902";

/**
 * Reusable phone → OTP verification step.
 * Used by the appointment booking flow and, optionally, QR queue join.
 */
export function OtpVerify({
  onVerified,
  title = "Verify your phone",
  lead = "We send a 6-digit code so we can text you when your turn is close.",
}: {
  onVerified: (phone: string) => void;
  title?: string;
  lead?: string;
}) {
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"phone" | "code" | "done">("phone");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const phoneValid = phone.replace(/\D/g, "").length >= 10;
  const code = digits.join("");

  useEffect(() => {
    if (stage === "code") boxes.current[0]?.focus();
  }, [stage]);

  async function send() {
    if (!phoneValid) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setError(null);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    setBusy(false);
    setStage("code");
    toast.success("Code sent", { description: `Demo code is ${DEMO_OTP}.` });
  }

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = clean;
      return next;
    });
    if (clean && i < 5) boxes.current[i + 1]?.focus();
  }

  async function verify() {
    if (code.length < 6) {
      setError("Enter all six digits.");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 800));
    setBusy(false);
    if (code !== DEMO_OTP) {
      setError("That code doesn't match. Demo code is " + DEMO_OTP + ".");
      return;
    }
    setError(null);
    setStage("done");
    setTimeout(() => onVerified(phone), 900);
  }

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="font-display text-xl font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{lead}</p>
      </div>

      <AnimatePresence mode="wait">
        {stage === "phone" ? (
          <motion.div
            key="phone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-3"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="otp-phone">Mobile number</Label>
              <div className="relative">
                <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="otp-phone"
                  inputMode="tel"
                  className="pl-9"
                  placeholder="+91 98250 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <Button variant="brand" onClick={send} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send code
            </Button>
          </motion.div>
        ) : null}

        {stage === "code" ? (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-3"
          >
            <div className="flex gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    boxes.current[i] = el;
                  }}
                  value={d}
                  inputMode="numeric"
                  aria-label={`Digit ${i + 1}`}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
                  }}
                  className={cn(
                    "h-14 w-full rounded-xl border border-border bg-surface text-center font-display text-xl font-bold outline-none transition-colors",
                    "focus:border-primary focus:ring-2 focus:ring-primary/25",
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Demo environment — use code <span className="font-semibold text-foreground">{DEMO_OTP}</span>.{" "}
              <button
                className="text-primary hover:underline"
                onClick={() => setDigits(DEMO_OTP.split(""))}
              >
                Auto-fill
              </button>
            </p>
            <Button variant="brand" onClick={verify} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify
            </Button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setStage("phone")}
            >
              Use a different number
            </button>
          </motion.div>
        ) : null}

        {stage === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-emerald/30 bg-emerald/10 px-6 py-8 text-center"
          >
            <motion.span
              initial={{ scale: 0.4, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 14 }}
              className="text-emerald"
            >
              <CheckCircle2 className="h-10 w-10" />
            </motion.span>
            <p className="font-semibold">Number verified</p>
            <p className="text-sm text-muted-foreground">Taking you to the next step…</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? <p className="text-xs font-medium text-coral">{error}</p> : null}
    </div>
  );
}
