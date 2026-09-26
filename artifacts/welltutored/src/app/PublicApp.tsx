import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { LoadingState } from "@/components/LoadingState";
import NotFound from "@/pages/not-found";
import { RouteMeta } from "./RouteMeta";
import { routePaths } from "./route-map";

const Home = lazy(() => import("@/pages/Home"));
const TutorProfile = lazy(() => import("@/pages/TutorProfile"));
const Resources = lazy(() => import("@/pages/Resources"));
const ResourceDetail = lazy(() => import("@/pages/ResourceDetail"));
const Enquiry = lazy(() => import("@/pages/Enquiry"));

function RouteLoading() {
  return <LoadingState message="Loading page..." />;
}

export function PublicRoutes() {
  return (
    <>
      <RouteMeta />
      <Shell isSignedIn={false}>
        <Suspense fallback={<RouteLoading />}>
          <Switch>
            <Route path={routePaths.public.home} component={Home} />
            <Route path={routePaths.public.tutorProfile} component={TutorProfile} />
            <Route path={routePaths.public.resources} component={Resources} />
            <Route path={routePaths.public.resourceDetail} component={ResourceDetail} />
            <Route path={routePaths.public.enquiry} component={Enquiry} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </Shell>
    </>
  );
}

export default PublicRoutes;