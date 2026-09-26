# CLAUDE.md

## Read this first

[PROJECT.md](PROJECT.md) is the source of truth for this project: stack, run
commands, where things live, architecture decisions, and gotchas. Read it
before answering questions about how the project works or making changes.

Keep it that way. When something changes that belongs in a project brief,
update `PROJECT.md`, not this file. This file covers only what differs when
working through Claude Code.

## Running things here

Everything runs in containers — there is no host Node, pnpm, or PostgreSQL.
[docs/local-docker.md](docs/local-docker.md) has the full workflow; the short
version:

```
docker compose up api web          # http://localhost:5173
docker compose run --rm migrate    # apply schema changes
docker compose run --rm test       # full CI suite
```

So the commands in `PROJECT.md` are correct but need a prefix: `docker compose
exec api <command>` against a running service, or `docker compose run --rm
--entrypoint bash api -lc '<command>'` for a one-off.

## Merging to `main` ships to production

CI deploys to Fly on every push to `main` and then runs the launch smoke
against the live site. There is no separate release step, so a merged pull
request is a shipped one.

It does **not** apply the schema — that is a deliberate `push` you run
yourself, before merging anything that expects it. See
[ADR-0002](docs/adr/0002-schema-by-deliberate-push.md) and
[docs/deploy.md](docs/deploy.md), where the command lives.

**The lockfile must stay stable.** CI and the deployment build both install
with `--frozen-lockfile`. `package.json` pins `packageManager`, and
`docker/Dockerfile.dev` pins the matching pnpm; keep them in step or the deploy
fails on a lockfile it did not expect.

## Documentation is validated

`pnpm run docs:check` parses `PROJECT.md`, everything under `docs/`, and the
`run:` steps of `.github/workflows/*.yml`, and fails when a `pnpm` command
names a script that does not exist or a local link does not resolve. It runs as
part of `pnpm run build`, so a careless doc edit breaks the deployment build.

It does not check this file. Claims here are unverified, so keep them few.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `sumau/well-tutored`, driven by the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its role name.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
