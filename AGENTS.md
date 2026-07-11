# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

A public example app demonstrating WorkOS **standalone SSO**, **Directory Sync**, and the **Admin Portal** using `@workos-inc/node` — deliberately **not** AuthKit. It models a small B2B SaaS: create an organization, hand its IT admin an Admin Portal link to configure SSO and a directory, sign users in via SSO, and read synced users/groups. For the AuthKit path, see [`workos/next-authkit-example`](https://github.com/workos/next-authkit-example).

## Stack

- Node.js >= 22.11 (SDK requirement; `.mise.toml` pins 24.x for local dev), npm
- Express 5 + TypeScript (ESM, run directly with `tsx` — no build step)
- Server-rendered EJS views, one plain CSS file, no client framework
- `express-session` with the in-memory store (fine for a demo)
- oxlint + oxfmt, GitHub Actions CI

## Commands

```sh
npm install
npm run dev            # tsx watch src/server.ts
npm run start
npm run lint           # oxlint (lint:fix to autofix)
npm run format         # oxfmt (format:check in CI)
npm run typecheck      # tsc --noEmit
```

## File map

- `src/server.ts` — entry point; boots the app
- `src/config.ts` — env validation (fails fast, lists all missing vars); single source of `redirectUri`
- `src/workos.ts` — the one `WorkOS` client instance
- `src/app.ts` — Express factory: middleware order, view engine, routers, error handler
- `src/session.ts` — session typing + `requireProfile` middleware
- `src/event-log.ts` — in-memory ring buffer of received webhook events
- `src/routes/home.ts` — org list, profile page
- `src/routes/organizations.ts` — create org, org detail, Admin Portal link generation
- `src/routes/sso.ts` — SSO start/callback/logout
- `src/routes/directory.ts` — synced users & groups
- `src/routes/webhooks.ts` — webhook receiver (raw body + signature verification) and event log page
- `src/views/`, `src/public/` — EJS templates and CSS

## Environment variables

See `.env.example`. Required: `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `SESSION_SECRET`. Optional: `WORKOS_WEBHOOK_SECRET` (webhook route returns 501 without it), `BASE_URL`, `PORT`.

## How the flows work

1. **Admin Portal**: `POST /organizations/:id/portal` calls `workos.adminPortal.generateLink({ organization, intent: 'sso' | 'dsync', returnUrl })` and redirects to the single-use link.
2. **SSO**: `/auth/sso/start` stores a random `state` in the session and redirects to `workos.sso.getAuthorizationUrl(...)`; `/auth/sso/callback` verifies `state`, exchanges the code via `getProfileAndToken`, regenerates the session, and stores the profile.
3. **Directory reads**: `/organizations/:id/directory` calls `listDirectories({ organizationId })`, then `listUsers` / `listGroups` for the selected directory.
4. **Webhooks**: `POST /webhooks` parses the body with `express.raw()` (never a JSON parser) so `workos.webhooks.constructEvent` can verify the `WorkOS-Signature` header against the exact bytes sent.

## Conventions

- Named import: `import { WorkOS } from '@workos-inc/node'`.
- No type assertions (`as`) — narrow with type guards instead.
- Keep files small and single-purpose; this repo is teaching code people copy from.
- Express 5: async handlers propagate rejections to the error handler automatically — no wrapper needed.
- Run `npm run lint && npm run format && npm run typecheck` before committing.

## WorkOS MCP

When working against a real WorkOS environment, connect the [WorkOS MCP server](https://workos.com/docs/mcp) (`https://mcp.workos.com/mcp`) — it lets you inspect and manage environment state (organizations, applications, redirect URIs, directories) directly instead of asking a human to click through the dashboard.

## What not to do

- Don't add AuthKit or User Management — standalone SSO is the point of this example.
- Don't add a database, background jobs, or a frontend framework; the demo stays dependency-light.
- Don't remove the raw-body handling on the webhook route or the `state` check on the SSO callback.
- Don't commit `.env` or put real keys in code, docs, or examples.
- This is a public repo: no internal references of any kind.
