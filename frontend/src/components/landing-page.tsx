"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BorderBeam } from "@/components/ui/border-beam";
import { getToken, fetchWithAuth, setToken } from "@/lib/auth";

/* ─── Feature card data ─────────────────────────────────────────────────── */
const FEATURE_CARDS = [
  {
    id: "kanban",
    img: "/kanban-sign.png",
    tag: "Boards",
    headline: "Flow without friction.",
    sub: "Drag-and-drop Kanban boards that keep your team in sync — always.",
    accent: "#0c8f8f",
  },
  {
    id: "scrum",
    img: "/scrum-sign.png",
    tag: "Sprints",
    headline: "Ship on schedule.",
    sub: "Sprint planning, backlogs and velocity — Scrum, done right.",
    accent: "#2f9aa6",
  },
  {
    id: "bug",
    img: "/bug-sign.webp",
    tag: "Bug Tracking",
    headline: "Catch bugs. Kill them fast.",
    sub: "Log, assign and resolve issues before they reach production.",
    accent: "#1f9d6f",
  },
  {
    id: "custom",
    img: "/custom-sign.png",
    tag: "Custom Boards",
    headline: "Your workflow, your rules.",
    sub: "Build any board structure that fits your team's process exactly.",
    accent: "#a7bbd1",
  },
];

/* ─── Why Unify rows ─────────────────────────────────────────────────────── */
const WHY_ROWS = [
  {
    label: "One workspace",
    desc: "Boards, repos, AI — all in one tab.",
  },
  {
    label: "AI-native",
    desc: "Unify Intelli understands your code and your plans.",
  },
  {
    label: "Git-connected",
    desc: "GitHub & GitLab issues become work items automatically.",
  },
  {
    label: "Every view",
    desc: "List, Timeline, Calendar, Reports — pick your lens.",
  },
];

/* ─── Carousel hook ─────────────────────────────────────────────────────── */
function useCarousel(total: number, autoMs = 4000) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback(
    (next: number) => setIdx(((next % total) + total) % total),
    [total]
  );

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % total), autoMs);
  }, [total, autoMs]);

  useEffect(() => {
    reset();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [reset]);

  const prev = () => { go(idx - 1); reset(); };
  const next = () => { go(idx + 1); reset(); };
  const jump = (i: number) => { go(i); reset(); };

  return { idx, prev, next, jump };
}

/* ─── Animated counter ──────────────────────────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString() + suffix);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        animate(count, to, { duration: 1.6, ease: "easeOut" });
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [count, to]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

/* ─── Main component ────────────────────────────────────────────────────── */
export default function LandingPage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
  const [user, setUser] = useState<{ fullName?: string | null; email: string } | null>(null);
  const { idx, prev, next, jump } = useCarousel(FEATURE_CARDS.length, 4500);

  // ── Email/password auth state ────────────────────────────────────────────
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function openAuth(tab: "signin" | "signup") {
    setAuthTab(tab);
    setAuthError(null);
    setAuthModalOpen(true);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint = authTab === "signin"
        ? `${apiBase}/api/v1/auth/signin`
        : `${apiBase}/api/v1/auth/signup`;
      const body: Record<string, string> = { email: authEmail, password: authPassword };
      if (authTab === "signup" && authName.trim()) body.fullName = authName.trim();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setToken(data.accessToken);
      setUser(data.user);
      setAuthModalOpen(false);
      router.push("/dashboard");
    } catch {
      setAuthError("Network error. Please check your connection.");
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchWithAuth(`${apiBase}/api/v1/auth/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setUser(d.user);
        }
      })
      .catch(() => null);
  }, [apiBase, router]);

  const card = FEATURE_CARDS[idx];

  return (
    <div className="landing-root bg-[#f2f9f8] text-slate-900 flex flex-col items-center relative min-h-[100dvh] overflow-x-hidden w-full">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="landing-nav w-full max-w-[1120px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex justify-center items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Unify"
            width={46}
            height={46}
            className="rounded-full object-cover"
          />
          <span className="text-[26px] font-semibold tracking-tight text-slate-900">Unify</span>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <Button onClick={() => router.push("/dashboard")} size="sm" className="rounded-lg font-semibold bg-[#0c8f8f]/10 hover:bg-[#0c8f8f]/20 text-slate-900 shadow-none">
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => openAuth("signin")} className="rounded-lg font-semibold bg-[#0c8f8f]/15 hover:bg-[#0c8f8f]/25 text-slate-900 shadow-none">
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col w-full max-w-[1120px] mx-auto px-6 pt-12 pb-6 md:pt-20 md:pb-10">
        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col md:flex-row items-center justify-between gap-12 w-full"
        >
          {/* Left: Text Content */}
          <div className="flex-1 flex flex-col items-start text-left max-w-[560px]">
            <span className="text-accent text-[11px] font-bold tracking-widest uppercase mb-4">
              COLLABORATIVE ENGINEERING WORKSPACE
            </span>
            <h1 className="text-4xl md:text-[2.75rem] font-bold tracking-tight text-slate-900 leading-[1.15] mb-5">
              Where Teams Build,<br />
              Collaborate,<br />
              and Deliver Better Software.
            </h1>
            <p className="text-[15px] text-slate-600 leading-relaxed mb-8 max-w-[480px]">
              Manage projects, connect GitHub repositories, analyze your codebase,
              and resolve production issues with Unify Intelli.
            </p>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Button
                size="lg"
                className="group rounded-xl bg-[#0c8f8f] hover:bg-[#0a7a7a] text-white font-medium w-full sm:w-[260px] justify-center h-12 shadow-[0_4px_14px_0_rgba(12,143,143,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(12,143,143,0.23)] hover:-translate-y-[1px] flex items-center gap-2"
                onClick={() => user ? router.push("/dashboard") : openAuth("signup")}
              >
                <span>{user ? "Go to Dashboard" : "Let's collaborate"}</span>
                <ExternalLink className="h-4 w-4 opacity-0 -ml-6 transition-all group-hover:opacity-100 group-hover:ml-0" />
              </Button>
            </div>
          </div>

          {/* Right: Illustration */}
          <div className="flex-1 w-full flex justify-end">
            <div className="relative w-full max-w-[500px] aspect-[4/3]">
              <Image
                src="/landing-page-bg.png"
                alt="Illustration"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </motion.section>
      </main>



      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="w-full py-3 text-center text-[11.5px] text-slate-400 mt-auto">
        © {new Date().getFullYear()} Unify. All rights reserved.
      </footer>

      {/* ── AUTH MODAL ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {authModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setAuthModalOpen(false)}
            />

            {/* Card */}
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[400px] sm:max-w-[360px] max-h-[90vh] overflow-y-auto scroll-thin z-10 rounded-[22px] sm:rounded-[28px] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] p-6 sm:p-8 flex flex-col items-center"
            // className="relative w-full max-w-[360px] max-h-[90vh] overflow-y-auto scroll-thin z-10 rounded-[22px] sm:rounded-[28px] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] p-4 sm:p-8 my-4 flex flex-col items-center"
            >
              {/* Close */}
              <button
                onClick={() => setAuthModalOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Icon badge */}
              <div className="mb-3 sm:mb-5 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Unify Logo"
                  width={56}
                  height={56}
                  className="object-contain rounded-full w-10 h-10 sm:w-14 sm:h-14"
                />
              </div>

              {/* Title */}
              <h2 className="text-[18px] sm:text-[22px] font-bold text-gray-900 tracking-tight mb-0.5 sm:mb-1 text-center">
                {authTab === "signin" ? "Sign in with email" : "Create your account"}
              </h2>
              <p className="text-[12px] sm:text-[13px] text-gray-400 text-center leading-relaxed mb-4 sm:mb-6 px-2">
                {authTab === "signin"
                  ? "Welcome back! Enter your details to continue."
                  : "Join Unify and start shipping faster with your team."}
              </p>

              {/* Tab switcher */}
              <div className="flex w-full mb-3 sm:mb-5 p-[3px] bg-gray-100 rounded-xl" role="tablist">
                <button
                  role="tab"
                  aria-selected={authTab === "signin"}
                  className={`flex-1 py-1.5 text-[13px] font-semibold rounded-[9px] transition-all ${authTab === "signin" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                  onClick={() => { setAuthTab("signin"); setAuthError(null); }}
                >
                  Sign In
                </button>
                <button
                  role="tab"
                  aria-selected={authTab === "signup"}
                  className={`flex-1 py-1.5 text-[13px] font-semibold rounded-[9px] transition-all ${authTab === "signup" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                  onClick={() => { setAuthTab("signup"); setAuthError(null); }}
                >
                  Sign Up
                </button>
              </div>

              {/* Form */}
              <form className="w-full flex flex-col gap-2 sm:gap-3" onSubmit={handleEmailAuth} noValidate>
                {authTab === "signup" && (
                  <div className="relative flex items-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <Input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Full Name"
                      className="pl-9 h-10 rounded-lg bg-gray-50 border-gray-200 focus-visible:ring-gray-400 focus-visible:border-gray-400 transition-colors text-[13px] text-gray-800 placeholder:text-gray-400"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                )}

                <div className="relative flex items-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    required
                    className="pl-9 h-10 rounded-lg bg-gray-50 border-gray-200 focus-visible:ring-gray-400 focus-visible:border-gray-400 transition-colors text-[13px] text-gray-800 placeholder:text-gray-400"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>

                <div className="relative flex items-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 z-10">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <Input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={authTab === "signin" ? "current-password" : "new-password"}
                    placeholder="Password"
                    required
                    className="pl-9 pr-9 h-10 rounded-lg bg-gray-50 border-gray-200 focus-visible:ring-gray-400 focus-visible:border-gray-400 transition-colors text-[13px] text-gray-800 placeholder:text-gray-400"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10 flex items-center justify-center h-full px-1"
                  >
                    {showPassword ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>

                {authTab === "signin" && (
                  <div className="flex justify-end">
                    <button type="button" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                )}

                {authError && (
                  <p className="text-[12px] text-red-500 text-center" role="alert">{authError}</p>
                )}

                <Button
                  type="submit"
                  disabled={authLoading}
                  className="mt-1 w-full h-10 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-semibold active:scale-[0.98] transition-all shadow-sm"
                >
                  {authLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : authTab === "signin" ? "Get Started" : "Create Account"}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 w-full my-3 sm:my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] text-gray-400">Or sign in with</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Social icons */}
              <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
                {/* Google */}
                <a
                  href={`${apiBase}/api/v1/auth/oauth/google`}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-medium text-gray-700 transition-colors shadow-sm"
                  title="Continue with Google"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="hidden sm:inline">Google</span>
                </a>

                {/* GitHub */}
                <a
                  href={`${apiBase}/api/v1/auth/oauth/github`}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-medium text-gray-700 transition-colors shadow-sm"
                  title="Continue with GitHub"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#1f2328" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline">GitHub</span>
                </a>

                {/* GitLab */}
                <a
                  href={`${apiBase}/api/v1/auth/oauth/gitlab`}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-medium text-gray-700 transition-colors shadow-sm"
                  title="Continue with GitLab"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#FC6D26" aria-hidden="true">
                    <path d="M4.845.904a.93.93 0 0 0-.888.63L.108 11.854a1.307 1.307 0 0 0 .474 1.46L12 22.096l11.418-8.782a1.307 1.307 0 0 0 .474-1.46L20.044 1.534a.93.93 0 0 0-.888-.63.93.93 0 0 0-.888.63l-2.552 7.85H8.284L5.732 1.534A.93.93 0 0 0 4.845.904z" />
                  </svg>
                  <span className="hidden sm:inline">GitLab</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
