# Well Tutored

Well Tutored helps families discover women tutors, read tutor-written
resources, and send named-tutor enquiries. Tutors maintain their profiles and
resources in a private workspace.

## Quick start

Everything runs in containers. Docker with Compose v2 is the only prerequisite.

```
cp .env.example .env
docker compose run --rm deps        # install the workspace
docker compose up -d db
docker compose run --rm migrate     # push the database schema
docker compose up api web
```

Then open <http://localhost:5173>. The API seeds illustrative tutors and
resources on first boot. To sign in to `/workspace`, put real Clerk dev keys in
`.env`; the placeholder is enough to browse the public site.

Run the full CI suite with:

```
docker compose run --rm test
```

## Where to read next

- [PROJECT.md](PROJECT.md): stack, commands, layout, architecture and gotchas.
  Start here.
- [CONTEXT.md](CONTEXT.md): the domain vocabulary shared by every package.
- [docs/local-docker.md](docs/local-docker.md): the container workflow in full.
- [docs/deploy.md](docs/deploy.md): deployment. **Merging to `main` ships to
  production**, and schema changes are applied by hand beforehand
  ([ADR-0002](docs/adr/0002-schema-by-deliberate-push.md)).
- [docs/adr/](docs/adr/): architecture decision records.

## Layout

| Path | What it holds |
| --- | --- |
| `artifacts/welltutored` | React + Vite frontend |
| `artifacts/api-server` | Express 5 API, which also serves the frontend build |
| `lib/db` | Drizzle/PostgreSQL schema |
| `lib/api-spec` | OpenAPI contract, source for the generated client and Zod schemas |
| `scripts` | Docs check, smoke checks and test-database tooling |
