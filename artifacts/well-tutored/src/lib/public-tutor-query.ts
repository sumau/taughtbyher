import {
  getGetTutorQueryKey,
  getListTutorsQueryKey,
} from "@workspace/api-client-react";
import type { QueryClient } from "@tanstack/react-query";

export const PUBLIC_TUTOR_STALE_TIME_MS = 30_000;
export const PUBLIC_TUTOR_GC_TIME_MS = 5 * 60_000;

/**
 * Public tutor data can be reused briefly between page visits. The request
 * cache policy still asks the browser to validate whenever React Query does
 * make a request, so explicit refetches do not accept an old browser response.
 */
export const publicTutorQueryOptions = {
  staleTime: PUBLIC_TUTOR_STALE_TIME_MS,
  gcTime: PUBLIC_TUTOR_GC_TIME_MS,
  refetchOnWindowFocus: false,
} as const;

export const publicTutorRequestOptions: RequestInit = {
  cache: "no-cache",
};

export function invalidatePublicTutorQueries(
  queryClient: QueryClient,
  slugs?: string | readonly (string | null | undefined)[],
) {
  const normalizedSlugs = new Set(
    (typeof slugs === "string" ? [slugs] : slugs ?? []).filter(
      (slug): slug is string => Boolean(slug),
    ),
  );

  queryClient.invalidateQueries({ queryKey: getListTutorsQueryKey() });
  for (const slug of normalizedSlugs) {
    queryClient.invalidateQueries({ queryKey: getGetTutorQueryKey(slug) });
  }
}