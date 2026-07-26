"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BorderBeam } from "@/components/ui/border-beam";
import { getToken, fetchWithAuth } from "@/lib/auth";
import { Globe3DDemo } from "@/components/ui/globe-demo";

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

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchWithAuth(`${apiBase}/api/v1/auth/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUser(d.user))
      .catch(() => null);
  }, [apiBase]);

  const card = FEATURE_CARDS[idx];

  return (
    <div className="landing-root overflow-hidden flex flex-col items-center relative">
      {/* ── GLOBE BACKGROUND ────────────────────────────────────────────── */}
      <div className="fixed top-[15vh] inset-x-0 w-full flex justify-center opacity-25 pointer-events-none -z-10 pointer-events-none mix-blend-screen">
        <Globe3DDemo />
      </div>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="landing-nav w-full max-w-[1120px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image
            src="/unify-intelli-icon.png"
            alt="Unify"
            width={32}
            height={32}
            className="rounded-[9px] object-cover"
          />
          <span className="text-[17px] font-bold tracking-tight text-foreground">Unify</span>
        </div>

        <nav className="hidden sm:flex items-center gap-1 text-[13px] font-medium text-muted">
          <a href="#features" className="px-3 py-1.5 rounded-lg hover:bg-foreground/[0.06] hover:text-foreground transition-colors">Features</a>
          <a href="#why" className="px-3 py-1.5 rounded-lg hover:bg-foreground/[0.06] hover:text-foreground transition-colors">Why Unify</a>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button onClick={() => router.push("/dashboard")} size="sm" className="rounded-lg">
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => router.push("/auth?tab=signin")} className="rounded-lg">
                Sign In
              </Button>
              <Button size="sm" onClick={() => router.push("/auth?tab=signup")} className="rounded-lg">
                Get Started
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center w-full max-w-[1120px] mx-auto px-6 py-12 gap-16">
        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-[720px] flex flex-col items-center"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
            <Sparkles className="h-3.5 w-3.5" />
            AI-native project workspace
          </span>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
            Plan. Code.{" "}
            <span className="text-accent">Ship.</span>
            <br />
            All in one place.
          </h1>

          <p className="text-lg text-muted max-w-[600px] leading-relaxed mb-8">
            Boards, backlogs, repos and an AI teammate — unified into one seamless workspace.
            No more tab switching. Just shipping.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Button
                size="lg"
                className="gap-2 rounded-xl text-base px-6 h-12 shadow-md shadow-accent/20"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  className="gap-2 rounded-xl text-base px-6 h-12 shadow-md shadow-accent/20"
                  onClick={() => router.push("/auth?tab=signup")}
                >
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl text-base px-6 h-12"
                  onClick={() => router.push("/auth?tab=signin")}
                >
                  Sign in
                </Button>
              </>
            )}
          </div>
        </motion.section>

        {/* ── CARDS CAROUSEL ─────────────────────────────────────────────── */}
        <motion.section
          id="features"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[960px]"
          aria-label="Feature carousel"
        >
          {/* Section label */}
          <div className="flex items-center justify-between mb-5 px-1">
            <p className="text-[13px] font-semibold tracking-wider uppercase text-muted">
              Built for every workflow
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={prev}
                aria-label="Previous feature"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border-subtle hover:bg-foreground/[0.06] transition-colors text-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                aria-label="Next feature"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border-subtle hover:bg-foreground/[0.06] transition-colors text-muted hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main carousel */}
          <div className="relative overflow-hidden rounded-[24px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <Card className="relative overflow-hidden flex flex-col md:flex-row min-h-[360px] rounded-[24px] border-border-subtle shadow-lg">
                  <BorderBeam duration={7} colorFrom={card.accent} colorTo="transparent" />

                  {/* Text side */}
                  <div className="flex flex-col justify-center gap-5 p-8 md:p-10 md:w-[46%] z-10 bg-panel">
                    <Badge
                      className="self-start text-[11px] px-2.5 py-1 rounded-md font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${card.accent} 12%, transparent)`,
                        color: card.accent,
                        border: `1px solid color-mix(in srgb, ${card.accent} 25%, transparent)`,
                      }}
                    >
                      {card.tag}
                    </Badge>

                    <div>
                      <h2 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight mb-3">
                        {card.headline}
                      </h2>
                      <p className="text-[15px] leading-relaxed text-muted">
                        {card.sub}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start gap-1.5 rounded-lg mt-2"
                      onClick={() => router.push("/auth?tab=signup")}
                    >
                      Try it <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Image side */}
                  <div className="relative md:flex-1 min-h-[240px] md:min-h-0 overflow-hidden flex items-center justify-center p-8 bg-gradient-to-br from-panel to-panel-strong border-l border-border-subtle">
                    <div className="relative w-full h-full min-h-[200px] max-w-[400px]">
                      <Image
                        src={card.img}
                        alt={card.tag}
                        fill
                        className="object-contain filter drop-shadow-xl transition-transform duration-500 hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-5 mb-2">
              {FEATURE_CARDS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => jump(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: i === idx ? 24 : 8,
                    height: 8,
                    background: i === idx
                      ? card.accent
                      : "color-mix(in srgb, var(--foreground) 18%, transparent)",
                  }}
                />
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── UNIFY INTELLI HIGHLIGHT ─────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[960px]"
        >
          <Card className="relative overflow-hidden rounded-[24px] flex flex-col md:flex-row items-center gap-0 border-border-subtle shadow-md">
            <BorderBeam duration={9} colorFrom="var(--accent)" colorTo="transparent" delay={2} />

            {/* Image panel */}
            <div className="relative w-full md:w-[42%] min-h-[240px] md:min-h-[320px] shrink-0 overflow-hidden bg-gradient-to-br from-accent/10 to-panel-strong border-r border-border-subtle flex items-center justify-center p-10">
              <div className="relative w-full h-full max-w-[200px] max-h-[200px]">
                <Image
                  src="/unify-intelli-icon.png"
                  alt="Unify Intelli AI"
                  fill
                  className="object-contain drop-shadow-2xl rounded-2xl"
                  sizes="(max-width: 768px) 100vw, 42vw"
                />
              </div>
            </div>

            {/* Text panel */}
            <div className="flex flex-col gap-4 p-8 md:p-12 bg-panel flex-1 w-full">
              <Badge className="self-start rounded-md bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> AI Teammate
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground leading-snug">
                Meet <span className="text-accent">Unify Intelli.</span>
                <br />Your AI that actually gets it.
              </h2>
              <p className="text-[15px] leading-relaxed text-muted max-w-[420px]">
                Intelli reads your repos, understands your issues and generates plans — not just answers.
                Ask it anything. Let it do the heavy lifting.
              </p>
              <ul className="flex flex-col gap-3 text-[14px] text-muted mt-2">
                {[
                  "Code-aware context from GitHub & GitLab",
                  "Sprint planning suggestions",
                  "Issue summarisation & triage",
                ].map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5">
                    <span className="mt-[2px] h-[18px] w-[18px] rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white bg-accent shadow-sm">
                      ✓
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </motion.section>

        {/* ── WHY UNIFY + STATS ───────────────────────────────────────────── */}
        <motion.section
          id="why"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[960px] grid md:grid-cols-2 gap-6"
        >
          {/* Left: Why rows */}
          <Card className="rounded-[24px] p-8 md:p-10 flex flex-col gap-6 shadow-sm">
            <p className="text-[13px] font-semibold tracking-widest uppercase text-muted">
              Why teams choose Unify
            </p>
            <div className="flex flex-col gap-5">
              {WHY_ROWS.map(({ label, desc }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.35 }}
                  className="flex items-start gap-3.5"
                >
                  <span className="mt-0.5 h-6 w-6 rounded-lg shrink-0 flex items-center justify-center text-[12px] font-bold bg-accent/10 text-accent border border-accent/20">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-foreground leading-tight">{label}</p>
                    <p className="text-[14px] text-muted mt-1">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Right: Stats + views grid */}
          <div className="flex flex-col gap-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: 4, suffix: " boards", label: "Board types" },
                { val: 3, suffix: " Git providers", label: "Integrations" },
                { val: 6, suffix: " views", label: "Project views" },
                { val: 1, suffix: " AI", label: "Built-in teammate" },
              ].map(({ val, suffix, label }) => (
                <Card key={label} className="rounded-[20px] p-6 flex flex-col gap-1.5 shadow-sm justify-center">
                  <span className="text-3xl font-extrabold text-accent leading-none tracking-tight">
                    <Counter to={val} suffix={suffix} />
                  </span>
                  <span className="text-[13px] font-medium text-muted">{label}</span>
                </Card>
              ))}
            </div>

            {/* Views grid */}
            <Card className="rounded-[20px] p-6 flex flex-col gap-4 shadow-sm flex-1 justify-center">
              <p className="text-[13px] font-semibold tracking-widest uppercase text-muted">
                Every view you need
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {["List", "Timeline", "Calendar", "Reports", "Board", "Backlog"].map((v) => (
                  <div
                    key={v}
                    className="rounded-xl px-3 py-2.5 text-[13px] font-semibold text-center bg-accent/5 text-accent border border-accent/10 transition-colors hover:bg-accent/10"
                  >
                    {v}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </motion.section>

        {/* ── BOTTOM CTA ──────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[960px] pb-12"
        >
          <Card className="relative overflow-hidden rounded-[24px] py-16 px-8 flex flex-col items-center text-center gap-6 shadow-md border-border-subtle bg-panel">
            <BorderBeam duration={10} colorFrom="var(--accent)" colorTo="var(--accent-soft)" />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 80% 60% at 50% 120%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%)",
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="p-1 rounded-[18px] bg-background border border-border-subtle shadow-sm">
                <Image
                  src="/unify-intelli-icon.png"
                  alt="Unify"
                  width={56}
                  height={56}
                  className="rounded-[14px]"
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight max-w-[500px]">
                Your whole team. One workspace.
                <span className="text-accent"> Zero chaos.</span>
              </h2>
              <p className="text-[16px] text-muted max-w-[420px] leading-relaxed">
                Sign up in seconds. Bring your team. Start shipping.
              </p>
              <div className="flex gap-3 flex-wrap justify-center mt-2">
                <Button
                  size="lg"
                  className="gap-2 px-8 h-12 rounded-xl text-[15px]"
                  onClick={() => router.push("/auth?tab=signup")}
                >
                  Get started free <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 h-12 rounded-xl text-[15px]"
                  onClick={() => router.push("/auth?tab=signin")}
                >
                  Sign in
                </Button>
              </div>

              {/* OAuth hints */}
              <p className="text-[13px] text-muted mt-2">
                Continue with{" "}
                {["Google", "GitHub", "GitLab"].map((p, i, arr) => (
                  <span key={p}>
                    <a
                      href={`${apiBase}/api/v1/auth/oauth/${p.toLowerCase()}`}
                      className="text-accent hover:underline underline-offset-2 font-medium"
                    >
                      {p}
                    </a>
                    {i < arr.length - 1 && <span className="text-muted/40 mx-1.5"> · </span>}
                  </span>
                ))}
              </p>
            </div>
          </Card>
        </motion.section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="w-full py-6 text-center text-[13px] text-muted/60 border-t border-border-subtle mt-auto bg-background">
        © {new Date().getFullYear()} Unify · Built for teams that ship.
      </footer>
    </div>
  );
}
