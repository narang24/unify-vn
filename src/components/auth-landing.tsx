"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LockKeyhole, Mail, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { type SVGProps, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { setToken } from "@/lib/auth";

// ─── Icons ────────────────────────────────────────────────────────────────────

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" {...props}>
      <path fill="#EA4335" d="M12 10.2v3.95h5.48c-.24 1.3-1.72 3.83-5.48 3.83A6.3 6.3 0 1 1 12 5.7c1.8 0 3 .76 3.7 1.42l2.53-2.44C16.65 3.18 14.6 2.2 12 2.2a9.8 9.8 0 1 0 0 19.6c5.72 0 9.53-4.02 9.53-9.68 0-.65-.07-1.15-.16-1.64H12Z" />
      <path fill="#FBBC05" d="M4.53 7.35 7.5 9.53A6.3 6.3 0 0 1 12 5.7a9.3 9.3 0 0 1 6.6 2.59L21 5.9A13.1 13.1 0 0 0 12 2.2a9.9 9.9 0 0 0-7.47 5.15Z" />
      <path fill="#34A853" d="M12 22c2.52 0 4.64-.83 6.18-2.25l-2.86-2.23c-.78.54-1.84.92-3.32.92a6.3 6.3 0 0 1-5.9-4.1l-3.05 2.35A9.9 9.9 0 0 0 12 22Z" />
      <path fill="#4285F4" d="M21.03 12.1c0-.61-.05-1.06-.16-1.63H12v3.95h5.48c-.28 1.3-1 2.33-2.16 3.03l2.86 2.23C19.72 17.81 21.03 15.36 21.03 12.1Z" />
    </svg>
  );
}

function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current" {...props}>
      <path d="M12 .5C5.65.5.5 5.75.5 12.26c0 5.2 3.34 9.62 7.97 11.17.58.11.8-.25.8-.57v-2.03c-3.24.73-3.93-1.6-3.93-1.6-.53-1.41-1.3-1.79-1.3-1.79-1.06-.75.08-.74.08-.74 1.17.08 1.78 1.23 1.78 1.23 1.04 1.82 2.72 1.3 3.39 1 .11-.78.41-1.3.75-1.6-2.58-.3-5.29-1.32-5.29-5.88 0-1.3.46-2.37 1.22-3.2-.12-.3-.53-1.51.11-3.15 0 0 .99-.33 3.24 1.22a10.72 10.72 0 0 1 5.9 0c2.24-1.55 3.23-1.22 3.23-1.22.65 1.64.24 2.85.12 3.15.76.83 1.22 1.9 1.22 3.2 0 4.57-2.72 5.57-5.31 5.86.42.37.79 1.1.79 2.23v3.3c0 .32.21.69.8.57 4.62-1.55 7.96-5.98 7.96-11.17C23.5 5.75 18.35.5 12 .5Z" />
    </svg>
  );
}

function GitlabIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" {...props}>
      <path fill="#FC6D26" d="M12 22 2.6 12.6l2.1-6.7a.8.8 0 0 1 1.5 0l1.8 5.7h8l1.8-5.7a.8.8 0 0 1 1.5 0l2.1 6.7L12 22Z" />
      <path fill="#E24329" d="M12 22 2.6 12.6h18.8L12 22Z" opacity="0.9" />
      <path fill="#FCA326" d="m12 22 3-9.4H9L12 22Z" opacity="0.95" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "signIn" | "signUp";
type FeedbackType = "idle" | "loading" | "success" | "error";

interface Feedback {
  type: FeedbackType;
  message: string;
}

const socialProviders = [
  { id: "google", label: "Continue with Google", icon: GoogleIcon },
  { id: "github", label: "Continue with GitHub", icon: GithubIcon },
  { id: "gitlab", label: "Continue with GitLab", icon: GitlabIcon },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function AuthLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signIn");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({ type: "idle", message: "" });
  const formRef = useRef<HTMLFormElement>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

  // Show error coming back from failed OAuth redirect
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const messages: Record<string, string> = {
        google_failed: "Google sign-in failed. Please try again.",
        github_failed: "GitHub sign-in failed. Please try again.",
        gitlab_failed: "GitLab sign-in failed. Please try again.",
      };
      setFeedback({ type: "error", message: messages[error] ?? "Authentication failed." });
    }
  }, [searchParams]);

  // ── Social OAuth redirect ─────────────────────────────────────────────────

  function handleSocialClick(provider: string) {
    setLoadingProvider(provider);
    // Redirect browser to backend OAuth initiation URL — the backend handles the rest
    window.location.href = `${apiBaseUrl}/api/v1/auth/oauth/${provider}`;
  }

  // ── Email form submit ─────────────────────────────────────────────────────

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback({ type: "loading", message: mode === "signIn" ? "Signing in…" : "Creating account…" });

    const formData = new FormData(event.currentTarget);
    const payload = {
      fullName: String(formData.get("name") ?? "").trim() || undefined,
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? "").trim(),
    };

    try {
      const endpoint = mode === "signIn" ? "signin" : "signup";
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
        accessToken?: string;
        user?: { id: string; fullName?: string | null; email: string };
      };

      if (!response.ok) {
        setFeedback({ type: "error", message: data.error ?? "Something went wrong." });
        return;
      }

      if (data.accessToken) setToken(data.accessToken);
      setFeedback({ type: "success", message: data.message ?? "Success!" });
      formRef.current?.reset();

      // Redirect to dashboard
      setTimeout(() => router.push("/dashboard"), 600);
    } catch {
      setFeedback({ type: "error", message: "Could not reach the server. Is the backend running?" });
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setFeedback({ type: "idle", message: "" });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="h-screen overflow-hidden p-4">
      <div className="mx-auto flex h-full w-full max-w-350 overflow-hidden rounded-4xl border border-border-subtle bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.06))] shadow-[0_24px_80px_rgba(44,53,91,0.12)]">
        <section className="grid h-full w-full gap-4 bg-panel p-4 lg:grid-cols-[0.95fr_1.05fr] lg:gap-5 lg:p-5">

          {/* ── Left panel ─────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex h-full flex-col rounded-[28px] border border-border-subtle bg-[rgba(255,255,255,0.28)] p-4 lg:p-5"
          >
            {/* Logo */}
            <div className="flex items-center justify-between rounded-2xl border border-border-subtle px-4 py-3 text-foreground">
              <span className="text-[2rem] font-semibold italic leading-none tracking-[-0.06em] text-accent">Unify</span>
            </div>

            <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
              {/* Social buttons */}
              <div className="space-y-2.5">
                {socialProviders.map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    variant="secondary"
                    type="button"
                    disabled={loadingProvider !== null}
                    onClick={() => handleSocialClick(id)}
                    className="h-11 w-full justify-start rounded-2xl px-4 text-[13px] font-medium text-[#3d445e] shadow-[0_6px_18px_rgba(44,53,91,0.04)] disabled:opacity-60"
                  >
                    {loadingProvider === id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    {label}
                  </Button>
                ))}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-[#8b8376]">
                <Separator className="bg-border-subtle" />
                <span className="shrink-0">Or with email</span>
                <Separator className="bg-border-subtle" />
              </div>

              {/* Email / password form */}
              <Card className="rounded-[26px] bg-(--panel)/90 p-3.5 shadow-[0_14px_40px_rgba(44,53,91,0.08)] backdrop-blur">
                <form ref={formRef} className="space-y-3" onSubmit={handleSubmit}>
                  <div className="grid gap-3 sm:grid-cols-2">

                    {/* Full name (sign-up only) */}
                    <AnimatePresence initial={false}>
                      {mode === "signUp" && (
                        <motion.div
                          key="name-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-2 sm:col-span-2 overflow-hidden"
                        >
                          <Label className="sr-only" htmlFor="name">Full name</Label>
                          <Input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="Full name"
                            autoComplete="name"
                            className="h-11 rounded-2xl px-4"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email */}
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="sr-only" htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f8a80]" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                          className="h-11 rounded-2xl pl-11"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="sr-only" htmlFor="password">Password</Label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f8a80]" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                          minLength={8}
                          required
                          className="h-11 rounded-2xl pl-11 pr-11"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8f8a80] hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remember me + forgot */}
                  <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs">
                    <label className="flex items-center gap-2 text-[#514b44]">
                      <Checkbox
                        checked={rememberMe}
                        onCheckedChange={(v) => setRememberMe(Boolean(v))}
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      className="font-medium text-accent-soft transition hover:text-accent"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* CTA buttons */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="submit"
                      disabled={feedback.type === "loading"}
                      className={
                        mode === "signUp"
                          ? "h-11 w-full rounded-2xl bg-[linear-gradient(135deg,#4069f1,#2d55d1)] text-[15px] text-white shadow-[0_12px_24px_rgba(45,85,209,0.24)] hover:bg-[linear-gradient(135deg,#3558d9,#2348b5)] disabled:opacity-60"
                          : "h-11 w-full rounded-2xl text-[15px] disabled:opacity-60"
                      }
                    >
                      {feedback.type === "loading" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : mode === "signIn" ? (
                        "Sign In"
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-2xl text-[15px]"
                      onClick={() => switchMode(mode === "signIn" ? "signUp" : "signIn")}
                    >
                      {mode === "signIn" ? "Create Account" : "Sign In Instead"}
                    </Button>
                  </div>

                  {/* Feedback banner */}
                  <AnimatePresence>
                    {feedback.type !== "idle" && (
                      <motion.div
                        key={feedback.message}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium ${
                          feedback.type === "error"
                            ? "bg-red-50 text-red-600"
                            : feedback.type === "success"
                            ? "bg-green-50 text-green-700"
                            : "bg-[#f5f3ef] text-[#514b44]"
                        }`}
                      >
                        {feedback.type === "error" && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                        {feedback.type === "success" && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                        {feedback.type === "loading" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                        {feedback.message}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Mode switch link */}
                  <p className="pt-0.5 text-center text-[11px] text-[#675f56] sm:text-xs">
                    {mode === "signIn" ? "Don't have an account? " : "Already have an account? "}
                    <button
                      type="button"
                      onClick={() => switchMode(mode === "signIn" ? "signUp" : "signIn")}
                      className="font-semibold text-accent transition hover:text-accent-soft"
                    >
                      {mode === "signIn" ? "Sign Up" : "Sign In"}
                    </button>
                  </p>
                </form>
              </Card>
            </div>
          </motion.div>

          {/* ── Right panel ────────────────────────────────────────────────── */}
          <motion.aside
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.06, ease: "easeOut" }}
            className="relative flex h-full overflow-hidden rounded-[28px] bg-accent p-4 text-[#f5efe7] shadow-[0_24px_60px_rgba(44,53,91,0.18)] lg:p-5"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_55%)]" />
            <div className="absolute right-4 top-4 h-24 w-24 rounded-full border border-white/10 bg-white/5 blur-[0.2px]" />
            <div className="absolute bottom-6 left-8 h-32 w-32 rounded-full border border-white/8 bg-white/6 blur-[0.2px]" />
            <div className="relative flex h-full w-full flex-col justify-between gap-4">
              <div className="max-w-sm space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#cfd6f7]">
                  AI engineering agent
                </p>
                <h2 className="text-[2.6rem] font-semibold leading-[0.92] tracking-[-0.06em] text-[#fbf6ef] lg:text-[3.25rem]">
                  From ticket to production fix with context.
                </h2>
                <p className="max-w-md text-[13px] leading-5 text-[#d2d8f1] lg:text-sm">
                  Unify connects product work, code, releases, and incidents so your team can plan faster and debug smarter.
                </p>
              </div>

              <div className="grid gap-2.5 text-[12px] sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/12 bg-white/8 p-3.5 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#cfd6f7]">Collaboration</p>
                  <p className="mt-1.5 font-medium text-[#fbf6ef]">Real-time team coordination with lightweight workflows.</p>
                </div>
                <div className="rounded-[20px] border border-white/12 bg-white/8 p-3.5 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#cfd6f7]">Engineering</p>
                  <p className="mt-1.5 font-medium text-[#fbf6ef]">AI-assisted repo understanding, debugging, and release prep.</p>
                </div>
              </div>
            </div>
          </motion.aside>

        </section>
      </div>
    </main>
  );
}