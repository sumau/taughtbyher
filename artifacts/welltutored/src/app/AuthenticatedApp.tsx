import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/LoadingState";
import { ClerkApp } from "./ClerkApp";

const AuthenticatedRoutes = lazy(() => import("./routes"));

export default function AuthenticatedApp() {
  return (
    <ClerkApp>
      <Suspense fallback={<LoadingState message="Loading workspace..." />}>
        <AuthenticatedRoutes />
      </Suspense>
    </ClerkApp>
  );
}