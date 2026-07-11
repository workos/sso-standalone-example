import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const missing: string[] = [];

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    missing.push(name);
    return "";
  }
  return value;
}

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

export const config = Object.freeze({
  workosApiKey: required("WORKOS_API_KEY"),
  workosClientId: required("WORKOS_CLIENT_ID"),
  sessionSecret: required("SESSION_SECRET"),
  workosWebhookSecret: process.env.WORKOS_WEBHOOK_SECRET,
  baseUrl,
  port: Number(process.env.PORT ?? 3000),
  // Must be allow-listed in the WorkOS dashboard under Redirects.
  redirectUri: `${baseUrl}/auth/sso/callback`,
});

if (missing.length > 0) {
  console.error(
    `Missing required environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}\n\n` +
      "Copy .env.example to .env and fill in the values from the WorkOS dashboard.\n" +
      "See the README for where to find each one.",
  );
  process.exit(1);
}
