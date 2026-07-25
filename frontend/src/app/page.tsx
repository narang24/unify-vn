import { Suspense } from "react";
import LandingPage from "@/components/landing-page";

export default function Home() {
  return (
    <Suspense>
      <LandingPage />
    </Suspense>
  );
}
