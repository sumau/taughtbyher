import { lazy, Suspense } from "react";
import { Router as WouterRouter, useLocation } from "wouter";
import { LoadingState } from "@/components/LoadingState";
import { AppProviders } from "./app/AppProviders";
import { basePath } from "./app/base-path";
import { isAuthenticatedPath } from "./app/route-map";

const AuthenticatedApp = lazy(() => import("./app/AuthenticatedApp"));
const PublicApp = lazy(() => import("./app/PublicApp"));

function AuthenticatedRouteLoader() {
  const [location] = useLocation();

  return (
    <Suspense fallback={<LoadingState message="Loading page..." />}>
      {isAuthenticatedPath(location) ? <AuthenticatedApp /> : <PublicApp />}
    </Suspense>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppProviders>
        <AuthenticatedRouteLoader />
      </AppProviders>
    </WouterRouter>
  );
}

export default App;