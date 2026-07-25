"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      setStatus("Authentication failed. Redirecting…");
      setTimeout(() => router.replace(`/?error=${error}`), 1500);
      return;
    }

    if (!token) {
      setStatus("No token received. Redirecting…");
      setTimeout(() => router.replace("/"), 1500);
      return;
    }

    setToken(token);
    setStatus("Signed in! Redirecting…");
    setTimeout(() => router.replace("/dashboard"), 800);
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-[#8b8376]">{status}</p>
      </div>
    </div>
  );
}
