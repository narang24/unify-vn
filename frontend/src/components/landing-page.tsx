"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, GitBranch, Kanban, Bot, LayoutDashboard, ArrowRight } from "lucide-react";
import { getToken, setToken, fetchWithAuth } from "@/lib/auth";

export default function LandingPage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<{ fullName?: string | null; email: string } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchWithAuth(`${apiBase}/api/v1/auth/me`)
        .then(async (r) => {
          if (!r.ok) throw new Error("Not authorized");
          return r.json();
        })
        .then((data) => setUser(data.user))
        .catch(() => setUser(null));
    }
  }, [apiBase]);

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
      const endpoint =
        authTab === "signin"
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

  const features = [
    {
      icon: Kanban,
      title: "Boards that flow",
      desc: "Kanban, Scrum, bug tracking and custom boards — drag, drop, done.",
    },
    {
      icon: GitBranch,
      title: "Repos, connected",
      desc: "Bring GitHub & GitLab in. Turn code and issues into work items.",
    },
    {
      icon: Bot,
      title: "Unify Intelli",
      desc: "An AI teammate that understands your repos, issues and plans.",
    },
  ];

  return (
    <div className="landing-root">
      {/* Header Nav */}
      <header className="landing-nav">
        <div className="flex items-center gap-2">
          <div className="landing-logo">U</div>
          <span className="text-[17px] font-semibold tracking-tight text-foreground">Unify</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="landing-btn landing-btn--primary"
            >
              <LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </button>
          ) : (
            <>
              <button onClick={() => openAuth("signin")} className="landing-btn landing-btn--ghost">
                Sign In
              </button>
              <button onClick={() => openAuth("signup")} className="landing-btn landing-btn--primary">
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-main">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="landing-hero"
        >
          <span className="landing-pill">
            <Sparkles className="h-3.5 w-3.5" /> AI-native project workspace
          </span>
          <h1 className="landing-title">
            Where your <span className="landing-title-accent">plans</span> and{" "}
            <span className="landing-title-accent">code</span> finally meet.
          </h1>
          <p className="landing-sub">
            Unify brings boards, backlogs, repositories and an AI teammate into one compact,
            seamless workspace — so your team can plan and ship without switching tabs.
          </p>
          <div className="landing-cta-row">
            {user ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="landing-btn landing-btn--primary landing-btn--lg"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => openAuth("signup")}
                  className="landing-btn landing-btn--primary landing-btn--lg"
                >
                  Get started — it&apos;s free
                </button>
                <button
                  onClick={() => openAuth("signin")}
                  className="landing-btn landing-btn--outline landing-btn--lg"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="landing-features"
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="landing-feature">
              <div className="landing-feature-icon">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="landing-feature-title">{title}</h3>
              <p className="landing-feature-desc">{desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {authModalOpen && (
          <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/45"
              onClick={() => setAuthModalOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="auth-card relative"
            >
              <button
                onClick={() => setAuthModalOpen(false)}
                aria-label="Close"
                className="absolute right-3.5 top-3.5 rounded-md p-1 text-muted hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="auth-logo-wrap">
                <div className="auth-logo-icon">U</div>
                <h1 className="auth-title">Welcome to Unify</h1>
                <p className="auth-subtitle">
                  {authTab === "signin" ? "Sign in to continue" : "Create your account"}
                </p>
              </div>

              <div className="auth-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={authTab === "signin"}
                  className={`auth-tab${authTab === "signin" ? " auth-tab--active" : ""}`}
                  onClick={() => {
                    setAuthTab("signin");
                    setAuthError(null);
                  }}
                >
                  Sign In
                </button>
                <button
                  role="tab"
                  aria-selected={authTab === "signup"}
                  className={`auth-tab${authTab === "signup" ? " auth-tab--active" : ""}`}
                  onClick={() => {
                    setAuthTab("signup");
                    setAuthError(null);
                  }}
                >
                  Sign Up
                </button>
              </div>

              <form className="auth-form" onSubmit={handleEmailAuth} noValidate>
                {authTab === "signup" && (
                  <div className="auth-field">
                    <label htmlFor="auth-name" className="auth-label">
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Jane Doe"
                      className="auth-input"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                )}

                <div className="auth-field">
                  <label htmlFor="auth-email" className="auth-label">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    required
                    className="auth-input"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-password" className="auth-label">
                    Password
                  </label>
                  <div className="auth-password-wrap">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={authTab === "signin" ? "current-password" : "new-password"}
                      placeholder="••••••••"
                      required
                      className="auth-input auth-input--password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {authError && (
                  <p className="auth-error" role="alert">
                    {authError}
                  </p>
                )}

                <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                  {authLoading ? (
                    <span className="auth-spinner" />
                  ) : authTab === "signin" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <div className="auth-divider">
                <span className="auth-divider-line" />
                <span className="auth-divider-text">or continue with</span>
                <span className="auth-divider-line" />
              </div>

              <div className="auth-oauth-row">
                <a href={`${apiBase}/api/v1/auth/oauth/github`} className="auth-oauth-btn" title="Continue with GitHub">
                  <svg className="auth-oauth-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>GitHub</span>
                </a>
                <a href={`${apiBase}/api/v1/auth/oauth/google`} className="auth-oauth-btn" title="Continue with Google">
                  <svg className="auth-oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Google</span>
                </a>
                <a href={`${apiBase}/api/v1/auth/oauth/gitlab`} className="auth-oauth-btn" title="Continue with GitLab">
                  <svg className="auth-oauth-icon" viewBox="0 0 24 24" fill="#FC6D26" aria-hidden="true">
                    <path d="M4.845.904a.93.93 0 0 0-.888.63L.108 11.854a1.307 1.307 0 0 0 .474 1.46L12 22.096l11.418-8.782a1.307 1.307 0 0 0 .474-1.46L20.044 1.534a.93.93 0 0 0-.888-.63.93.93 0 0 0-.888.63l-2.552 7.85H8.284L5.732 1.534A.93.93 0 0 0 4.845.904z" />
                  </svg>
                  <span>GitLab</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
