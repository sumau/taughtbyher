import { lazy, Suspense, type ReactNode } from "react";
import { Redirect, Route, Switch, useParams } from "wouter";
import { Show, useAuth } from "@clerk/react";
import { Shell } from "@/components/layout/Shell";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { WorkspaceAuthBoundary } from "@/components/layout/WorkspaceAuthBoundary";
import { LoadingState } from "@/components/LoadingState";
import NotFound from "@/pages/not-found";
import {
  legacyWorkspaceResourcePath,
  routePaths,
  workspaceSignedOutRedirect,
} from "./route-map";
import { RouteMeta } from "./RouteMeta";

const SignInPage = lazy(() => import("@/pages/auth/sign-in"));
const SignUpPage = lazy(() => import("@/pages/auth/sign-up"));
const WorkspaceDashboard = lazy(() => import("@/pages/workspace/dashboard"));
const WorkspaceEnquiries = lazy(() => import("@/pages/workspace/enquiries"));
const WorkspaceAccounts = lazy(() => import("@/pages/workspace/accounts"));
const WorkspaceTutorProfiles = lazy(() => import("@/pages/workspace/tutor-profiles"));
const WorkspaceResourceEditor = lazy(() => import("@/pages/workspace/resource-editor"));
const WorkspaceProfile = lazy(() => import("@/pages/workspace/profile"));

function RouteLoading({ message }: { message: string }) {
  return <LoadingState message={message} />;
}

function LegacyWorkspaceResourceRedirect() {
  const params = useParams<{ id?: string }>();
  return (
    <Redirect to={legacyWorkspaceResourcePath(params.id)} />
  );
}

function WorkspaceRoutes() {
  return (
    <>
      <Show when="signed-in">
        <WorkspaceLayout>
          <WorkspaceAuthBoundary>
            <Suspense fallback={<RouteLoading message="Loading workspace..." />}>
              <Switch>
                <Route path={routePaths.workspace.root} component={WorkspaceDashboard} />
                <Route path={routePaths.workspace.enquiries} component={WorkspaceEnquiries} />
                <Route path={routePaths.workspace.accounts} component={WorkspaceAccounts} />
                <Route path={routePaths.workspace.tutors} component={WorkspaceTutorProfiles} />
                <Route path={routePaths.workspace.profile} component={WorkspaceProfile} />
                <Route path={routePaths.workspace.resourceNew} component={WorkspaceResourceEditor} />
                <Route path={routePaths.workspace.resource} component={WorkspaceResourceEditor} />
                <Route path={routePaths.workspace.legacyResourceNew} component={LegacyWorkspaceResourceRedirect} />
                <Route path={routePaths.workspace.legacyResource} component={LegacyWorkspaceResourceRedirect} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </WorkspaceAuthBoundary>
        </WorkspaceLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to={workspaceSignedOutRedirect()} />
      </Show>
    </>
  );
}

function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  return <Shell isSignedIn={Boolean(isSignedIn)}>{children}</Shell>;
}

export default function AuthenticatedRoutes() {
  return (
    <>
      <RouteMeta />
      <Switch>
        <Route path={routePaths.workspace.wildcard} component={WorkspaceRoutes} />
        <Route>
          <AuthenticatedShell>
            <Suspense fallback={<RouteLoading message="Loading page..." />}>
              <Switch>
                <Route path={routePaths.auth.signIn} component={SignInPage} />
                <Route path={routePaths.auth.signUp} component={SignUpPage} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </AuthenticatedShell>
        </Route>
      </Switch>
    </>
  );
}