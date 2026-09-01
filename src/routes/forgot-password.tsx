import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/logo";
import { motion, AnimatePresence } from "@/components/quesole/motion";
import { HeroBackground } from "@/components/quesole/hero-background";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Quesole" },
      {
        name: "description",
        content:
          "Request a password reset link for your Quesole console account and set a new password.",
      },
      { property: "og:title", content: "Reset your Quesole password" },
      {
        property: "og:description",
        content: "Send a reset link and choose a new password for the Quesole console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

type Stage = "email" | "sent" | "reset" | "done";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    if (!email.includes("@")) {
      setError("Enter the email address on your account.");
      return;
    }
    setError(null);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1100));
    setBusy(false);
    setStage("sent");
    toast.success("Reset link sent", { description: `Simulated email to ${email}.` });
  }

  async function resetPw() {
    if (pw.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1100));
    setBusy(false);
    setStage("done");
    toast.success("Password updated", { description: "Sign in with your new password." });
    setTimeout(() => navigate({ to: "/login" }), 1500);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <HeroBackground className="-z-10" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="panel w-full max-w-md p-8"
      >
        <Link to="/" className="mb-6 inline-flex items-center gap-2.5">
          <Logo size={32} />
        </Link>

        <AnimatePresence mode="wait">
          {stage === "email" ? (
            <motion.div key="email" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="grid gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your work email and we'll send a reset link.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fp-email">Work email</Label>
                <Input
                  id="fp-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button variant="brand" size="lg" onClick={sendLink} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send reset link
              </Button>
            </motion.div>
          ) : null}

          {stage === "sent" ? (
            <motion.div key="sent" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="grid gap-4 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <MailCheck className="h-7 w-7" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold">Check your inbox</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a reset link to <span className="font-medium text-foreground">{email}</span>.
                  Nothing is actually emailed in this demo.
                </p>
              </div>
              <Button variant="brand" size="lg" onClick={() => setStage("reset")}>
                <KeyRound className="h-4 w-4" /> I have a code
              </Button>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setStage("email")}>
                Use a different email
              </button>
            </motion.div>
          ) : null}

          {stage === "reset" ? (
            <motion.div key="reset" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="grid gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
                <p className="mt-1 text-sm text-muted-foreground">At least 8 characters.</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fp-pw">New password</Label>
                <Input id="fp-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fp-pw2">Confirm password</Label>
                <Input id="fp-pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              <Button variant="brand" size="lg" onClick={resetPw} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Reset password
              </Button>
            </motion.div>
          ) : null}

          {stage === "done" ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid gap-3 text-center">
              <motion.span
                initial={{ scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 230, damping: 14 }}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/15 text-emerald"
              >
                <CheckCircle2 className="h-7 w-7" />
              </motion.span>
              <h1 className="font-display text-2xl font-bold">Password updated</h1>
              <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {error ? <p className="mt-3 text-xs font-medium text-coral">{error}</p> : null}

        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
