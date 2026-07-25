"use client";

import { Suspense } from "react";
import DashboardPage from "@/components/auth-landing";

export default function Dashboard() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}
