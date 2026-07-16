# WorkOS standalone SSO + Directory Sync + Admin Portal example (Node)

An example [Express](https://expressjs.com) + TypeScript app demonstrating **standalone Single Sign-On**, **Directory Sync**, and the **Admin Portal** with the [WorkOS Node SDK](https://github.com/workos/workos-node) — wired into a session the app owns, without AuthKit.

> Refer to the [SSO](https://workos.com/docs/sso), [Directory Sync](https://workos.com/docs/directory-sync), and [Admin Portal](https://workos.com/docs/admin-portal) documentation for reference.

## What this demonstrates

The app plays the part of a small B2B SaaS becoming enterprise-ready:

- **Organizations** — each enterprise customer is a WorkOS organization, created through the API.
- **Admin Portal** — for each organization, generate a self-serve setup link (`workos.adminPortal.generateLink`) so your customer's IT admin can connect their identity provider and directory without you ever handling SAML metadata or SCIM credentials.
- **Standalone SSO** — service-provider-initiated sign-in scoped to an organization: `getAuthorizationUrl` → callback → `getProfileAndToken`, with the resulting profile stored in a session this app manages itself.
- **Directory Sync** — the org's synced users and groups, read live from the API (`listUsers`, `listGroups`), plus a webhook endpoint that verifies the `WorkOS-Signature` header and logs `dsync.*` events.

## When to use this vs AuthKit

Standalone SSO is an API for **integrating into an existing auth stack** — you keep your own sessions, user model, and sign-in UI, and add SSO alongside them. If you want a **complete authentication platform that includes SSO out of the box**, use [AuthKit](https://workos.com/docs/authkit) instead — see [`workos/next-authkit-example`](https://github.com/workos/next-authkit-example).

## Prerequisites

- A [WorkOS account](https://dashboard.workos.com/signup).
- Node.js **22.11 or later** (required by `@workos-inc/node` v10).

## Set up WorkOS

Do all of this in your **Staging** environment — it's free, and it includes test tooling you'll use below. Never use production keys for this demo.

1. In the [WorkOS dashboard](https://dashboard.workos.com), go to **Applications**, open your application, and add `http://localhost:3000/auth/sso/callback` as an allowed redirect URI on the **Redirects** tab.
2. Copy your credentials from the **API Keys** page: the **Secret Key** (`WORKOS_API_KEY`) and the **Client ID** (`WORKOS_CLIENT_ID`).

> [!TIP]
> Working with an AI assistant? The [WorkOS MCP server](https://workos.com/docs/mcp) (`claude mcp add --transport http workos https://mcp.workos.com/mcp`) lets it do this setup — and most other WorkOS management, like organizations, redirect URIs, and directories — conversationally, authenticated as you via OAuth.

## Configure and run

```sh
git clone https://github.com/workos/sso-standalone-example.git
cd sso-standalone-example
cp .env.example .env   # then fill in the values
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Variable                | Required | Description                                                                             |
| ----------------------- | -------- | --------------------------------------------------------------------------------------- |
| `WORKOS_API_KEY`        | Yes      | Staging Secret Key, from the dashboard's API Keys page                                  |
| `WORKOS_CLIENT_ID`      | Yes      | Client ID for the same environment                                                      |
| `SESSION_SECRET`        | Yes      | Random string (32+ characters) used to sign the session cookie                          |
| `WORKOS_WEBHOOK_SECRET` | No       | Webhook signing secret — only needed for [Testing webhooks](#testing-webhooks-optional) |
| `BASE_URL`              | No       | Where the app runs; defaults to `http://localhost:3000`                                 |
| `PORT`                  | No       | Defaults to `3000`                                                                      |

## Guided walkthrough

You'll switch between two roles: the **developer** of the SaaS app (working in this app) and your customer's **IT admin** (working in the Admin Portal).

The organization pages are the developer's side of the demo and are intentionally left unauthenticated — in a real app they'd sit behind your existing authentication.

**Try SSO immediately.** Your staging environment includes a default **Test Organization** with an active connection to WorkOS's [Test Identity Provider](https://workos.com/docs/sso/test-sso). It appears in the app's organization list — open it and click **Sign in with SSO** to complete a full SSO round trip against a simulated IdP, no configuration required. (The Test IdP verifies you with your own WorkOS sign-in — that screen is standing in for your customer's IdP login page.)

Then run the full story with an organization of your own:

1. **Create an organization** (developer) — on the home page, create a customer, e.g. `Acme, Inc.` with domain `acme.com`.
2. **Set up SSO** (IT admin) — on the organization's page, click **Set up SSO (Admin Portal)**. This generates a fresh portal link and opens it — in a real app you'd send this link to your customer instead. Walk through connecting an identity provider. Note that activating a connection requires the organization to have a **verified domain**; if you don't have an IdP tenant handy, do the SSO part of the walkthrough with the Test Organization above.
3. **Sign in with SSO** (end user) — back on the organization's page, click **Sign in with SSO**. After authenticating with the IdP you land on the profile page, showing the profile returned by `getProfileAndToken` — now held in this app's own session.
4. **Set up Directory Sync** (IT admin) — click **Set up Directory Sync (Admin Portal)** and connect a directory. No directory provider handy? Choose **Custom SCIM** — the portal shows a SCIM **Endpoint** and **Bearer Token**, and you can play the part of the directory yourself:

   ```sh
   curl -X POST "$SCIM_ENDPOINT/Users" \
     -H "Authorization: Bearer $SCIM_TOKEN" \
     -H "Content-Type: application/scim+json" \
     -d '{
       "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
       "userName": "jo@acme.com",
       "name": { "givenName": "Jo", "familyName": "Smith" },
       "emails": [{ "primary": true, "value": "jo@acme.com" }],
       "active": true
     }'
   ```

5. **View synced users and groups** (developer) — click **View synced users & groups** on the organization's page. The tables read live from `workos.directorySync.listUsers` / `listGroups`.

## Testing webhooks (optional)

The app also receives Directory Sync webhooks at `POST /webhooks`, verifying each payload's `WorkOS-Signature` header before trusting it. WorkOS needs a public URL to deliver to, so expose your local server with a tunnel:

1. Run a tunnel, e.g. `ngrok http 3000`.
2. In the dashboard, go to **Webhooks**, create an endpoint pointing at `https://<your-tunnel>/webhooks`, and subscribe to the `dsync.*` events.
3. Copy the endpoint's signing secret into `WORKOS_WEBHOOK_SECRET` in `.env` and restart the app.
4. Make a directory change (for example, re-run the `curl` above with a different `userName`), then open [http://localhost:3000/webhooks](http://localhost:3000/webhooks) to see the verified events.

## Learn more

- [SSO guide](https://workos.com/docs/sso)
- [Directory Sync guide](https://workos.com/docs/directory-sync)
- [Admin Portal guide](https://workos.com/docs/admin-portal)
- [Events & webhooks](https://workos.com/docs/events)
- [WorkOS Node SDK](https://github.com/workos/workos-node)

## Need help?

If you get stuck and can't resolve an issue with the [docs](https://workos.com/docs), reach out to [support@workos.com](mailto:support@workos.com) and we'll lend a hand.
