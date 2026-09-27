import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { mountWebClient } from "./lib/web-client";
import {
  getTrustedOrigins,
  isTrustedOrigin,
  requireTrustedMutationOrigin,
  RequestOriginError,
} from "./middlewares/request-origin";
import { apiErrorHandler } from "./middlewares/api-error-handler";
import { redirectToPublicOrigin } from "./middlewares/public-origin";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Before everything that answers a request, so a visitor on any other hostname
// is sent to the Public Origin rather than served from the one they typed.
app.use(redirectToPublicOrigin());
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, false);
        return;
      }
      if (isTrustedOrigin(origin)) {
        callback(null, true);
        return;
      }

      logger.warn(
        {
          origin,
          trustedOrigins: [...getTrustedOrigins()],
        },
        "CORS request rejected",
      );
      callback(new RequestOriginError());
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Scoped to /api, not global. Clerk treats a request that accepts text/html as
// a document request and answers it with a handshake redirect (307) when it
// cannot establish a session — which is every page load once this server serves
// the frontend itself, so a browser would bounce to Clerk instead of ever
// receiving the app. Mounting it at /api keeps it to API requests. The SPA
// authenticates client-side through @clerk/react.
app.use(
  "/api",
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);
app.use("/api/workspace", requireTrustedMutationOrigin);

app.use("/api", router);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// After the /api 404, so an unknown API path stays JSON instead of being
// answered with the SPA shell. A no-op in development.
mountWebClient(app);

app.use(apiErrorHandler);

export default app;
