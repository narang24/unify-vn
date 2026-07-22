import { Suspense } from "react";
import { AuthLanding } from "@/components/auth-landing";

export default function Home() {
  return (
    <Suspense>
      <AuthLanding />
    </Suspense>
  );
}
