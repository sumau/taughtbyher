import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  getGetTutorQueryKey,
  getListTutorsQueryKey,
} from "@workspace/api-client-react";
import {
  invalidatePublicTutorQueries,
  PUBLIC_TUTOR_STALE_TIME_MS,
  publicTutorQueryOptions,
} from "./public-tutor-query";

test("reuses a fresh tutor result and fetches again after it expires", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const queryKey = getListTutorsQueryKey();
  let requestCount = 0;
  const query = {
    ...publicTutorQueryOptions,
    queryKey,
    queryFn: async () => {
      requestCount += 1;
      return [];
    },
  };

  await queryClient.fetchQuery(query);
  await queryClient.fetchQuery(query);
  assert.equal(requestCount, 1);

  queryClient.setQueryData(queryKey, [], {
    updatedAt: Date.now() - PUBLIC_TUTOR_STALE_TIME_MS - 1,
  });
  await queryClient.fetchQuery(query);
  assert.equal(requestCount, 2);

  queryClient.clear();
});

test("invalidates the public list and affected tutor profiles after a mutation", async () => {
  const queryClient = new QueryClient();
  const listQueryKey = getListTutorsQueryKey();
  const profileQueryKey = getGetTutorQueryKey("alice-smith");

  queryClient.setQueryData(listQueryKey, []);
  queryClient.setQueryData(profileQueryKey, { slug: "alice-smith" });
  invalidatePublicTutorQueries(queryClient, ["alice-smith", "alice-smith"]);

  assert.equal(queryClient.getQueryState(listQueryKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(profileQueryKey)?.isInvalidated, true);

  queryClient.clear();
});