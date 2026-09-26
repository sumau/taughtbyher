# Production image: one container serving the built frontend and the API on a
# single origin. See
# docs/deploy.md.
#
# Build from the repository root, not from docker/:
#   docker build -f docker/Dockerfile --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_... -t well-tutored .
#
# glibc (bookworm), not Alpine, and linux/amd64: pnpm-workspace.yaml prunes every
# musl and non-x64 native binary (esbuild, lightningcss, @tailwindcss/oxide,
# rollup) out of the lockfile, so no other base can resolve a frozen install.
# Same constraint as docker/Dockerfile.dev and the CI runner.

FROM --platform=linux/amd64 node:24-bookworm-slim AS build

# Clerk's publishable key is read by the browser bundle, so it is baked in here
# rather than supplied at runtime. It is a public value; the secret key is not
# needed to build. Without it the private /workspace area cannot sign in, while
# the public site still works.
ARG VITE_CLERK_PUBLISHABLE_KEY=""
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

# Pinned to the root package.json "packageManager" field, like Dockerfile.dev
# and the CI setup action. Keep all of them in step.
RUN npm install -g pnpm@10.34.5 && npm cache clean --force

WORKDIR /workspace

# NODE_ENV is deliberately left alone in this stage: setting it to production
# here would make pnpm skip the devDependencies that vite and esbuild live in.
COPY . .
RUN pnpm install --frozen-lockfile

# Targeted builds, not `pnpm run build`: docs:check and the full typecheck are
# CI's job (.github/workflows/ci.yml), and the deployment image does not need
# the other artifacts. The API bundles its workspace dependencies from source
# through esbuild, so lib/* needs no separate build step.
RUN pnpm --filter @workspace/well-tutored run build \
  && pnpm --filter @workspace/api-server run build


FROM --platform=linux/amd64 node:24-bookworm-slim AS runtime

# esbuild bundles the server and its dependencies into dist/ (with pino's
# transports as sibling files), so the runtime carries no node_modules at all.
ENV NODE_ENV=production
ENV PORT=8080
ENV WEB_CLIENT_ROOT=/app/web

WORKDIR /app

COPY --from=build --chown=node:node /workspace/artifacts/api-server/dist ./dist
COPY --from=build --chown=node:node /workspace/artifacts/well-tutored/dist/public ./web

USER node
EXPOSE 8080

# /api/healthz is the check to point a platform's health probe at.
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
