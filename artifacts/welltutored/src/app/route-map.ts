export const routePaths = {
  public: {
    home: "/",
    tutorProfile: "/tutors/:slug",
    resources: "/resources",
    resourceDetail: "/resources/:slug",
    enquiry: "/enquire",
  },
  auth: {
    signIn: "/sign-in/*?",
    signUp: "/sign-up/*?",
  },
  workspace: {
    root: "/workspace",
    enquiries: "/workspace/enquiries",
    wildcard: "/workspace/*?",
    accounts: "/workspace/accounts",
    tutors: "/workspace/tutors",
    profile: "/workspace/profile",
    resourceNew: "/workspace/resources/new",
    resource: "/workspace/resources/:id",
    legacyResourceNew: "/workspace/articles/new",
    legacyResource: "/workspace/articles/:id",
  },
} as const;

export const publicRouteDefinitions = [
  { path: routePaths.public.home, page: "Home" },
  { path: routePaths.public.tutorProfile, page: "TutorProfile" },
  { path: routePaths.public.resources, page: "Resources" },
  { path: routePaths.public.resourceDetail, page: "ResourceDetail" },
  { path: routePaths.public.enquiry, page: "Enquiry" },
] as const;

export const authRouteDefinitions = [
  { path: routePaths.auth.signIn, page: "SignInPage" },
  { path: routePaths.auth.signUp, page: "SignUpPage" },
] as const;

export const workspaceRouteDefinitions = [
  { path: routePaths.workspace.root, page: "WorkspaceDashboard" },
  { path: routePaths.workspace.enquiries, page: "WorkspaceEnquiries" },
  { path: routePaths.workspace.accounts, page: "WorkspaceAccounts" },
  { path: routePaths.workspace.tutors, page: "WorkspaceTutorProfiles" },
  { path: routePaths.workspace.profile, page: "WorkspaceProfile" },
  { path: routePaths.workspace.resourceNew, page: "WorkspaceResourceEditor" },
  { path: routePaths.workspace.resource, page: "WorkspaceResourceEditor" },
  { path: routePaths.workspace.legacyResourceNew, page: "LegacyWorkspaceResourceRedirect" },
  { path: routePaths.workspace.legacyResource, page: "LegacyWorkspaceResourceRedirect" },
] as const;

function matchesPath(pathname: string, pattern: string) {
  const pathSegments = pathname.split("/").filter(Boolean);
  const patternSegments = pattern.split("/").filter(Boolean);

  if (patternSegments.at(-1) === "*?") {
    patternSegments.pop();
    if (pathSegments.length < patternSegments.length) return false;
  } else if (pathSegments.length !== patternSegments.length) {
    return false;
  }

  return patternSegments.every(
    (segment, index) =>
      segment.startsWith(":") || segment === pathSegments[index],
  );
}

export function legacyWorkspaceResourcePath(id?: string) {
  return id
    ? `/workspace/resources/${id}`
    : routePaths.workspace.resourceNew;
}

export function workspaceSignedOutRedirect() {
  return routePaths.auth.signIn.replace("/*?", "");
}

export function isAuthenticatedPath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0];
  return (
    path === routePaths.workspace.root ||
    path.startsWith("/workspace/") ||
    path === "/sign-in" ||
    path.startsWith("/sign-in/") ||
    path === "/sign-up" ||
    path.startsWith("/sign-up/")
  );
}

export type RouteMetadata = {
  title: string;
  description: string;
};

const defaultRouteMetadata: RouteMetadata = {
  title: "Well Tutored | Women tutors for secondary and A-level students",
  description:
    "Browse women tutors, read their subject resources and submit a named-tutor enquiry.",
};

function humanizeSlug(value: string) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function routeMetadataForPath(pathname: string): RouteMetadata {
  if (pathname === routePaths.public.resources) {
    return {
      title: "Insights & Resources | Well Tutored",
      description:
        "Read illustrative guides, revision notes and subject resources from Well Tutored tutors.",
    };
  }

  if (pathname.startsWith("/resources/")) {
    return {
      title: `${humanizeSlug(pathname.replace("/resources/", ""))} | Well Tutored Resources`,
      description: "Read an illustrative tutor-written resource from Well Tutored.",
    };
  }

  if (pathname.startsWith("/tutors/")) {
    return {
      title: `${humanizeSlug(pathname.replace("/tutors/", ""))} | Well Tutored`,
      description:
        "View this tutor’s subject expertise, qualifications, teaching style and named-tutor enquiry form.",
    };
  }

  if (pathname === routePaths.public.enquiry) {
    return {
      title: "Make an Enquiry | Well Tutored",
      description:
        "Tell Well Tutored which tutor you are interested in and what support would help.",
    };
  }

  if (pathname.startsWith("/workspace")) {
    return {
      title: "Workspace | Well Tutored",
      description: "Shared workspace for tutor profiles and resources.",
    };
  }

  return defaultRouteMetadata;
}

export type RouteResolution =
  | { kind: "page"; page: string }
  | { kind: "redirect"; to: string };

export function resolveRoute(
  pathname: string,
  isSignedIn = false,
): RouteResolution {
  if (pathname === "/workspace" || pathname.startsWith("/workspace/")) {
    if (!isSignedIn) {
      return { kind: "redirect", to: workspaceSignedOutRedirect() };
    }

    const workspaceRoute = workspaceRouteDefinitions.find(({ path }) =>
      matchesPath(pathname, path),
    );
    return { kind: "page", page: workspaceRoute?.page ?? "NotFound" };
  }

  const authRoute = authRouteDefinitions.find(({ path }) =>
    matchesPath(pathname, path),
  );
  if (authRoute) return { kind: "page", page: authRoute.page };

  const publicRoute = publicRouteDefinitions.find(({ path }) =>
    matchesPath(pathname, path),
  );
  return { kind: "page", page: publicRoute?.page ?? "NotFound" };
}