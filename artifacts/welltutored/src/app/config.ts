import { publishableKeyFromHost } from "@clerk/react/internal";
import { basePath, stripBase } from "./base-path";

export const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
export const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

export { basePath, stripBase };