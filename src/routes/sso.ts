import crypto from "node:crypto";
import { Router } from "express";
import { workos } from "../workos.js";
import { config } from "../config.js";

export const ssoRouter = Router();

ssoRouter.get("/sso/start", (req, res) => {
  const organization = req.query.organization;

  if (typeof organization !== "string" || organization === "") {
    res.status(400).render("error", {
      title: "Error",
      status: 400,
      message: "Missing ?organization= query parameter.",
    });
    return;
  }

  // Random state ties the callback to this browser session (CSRF protection).
  const state = crypto.randomBytes(16).toString("hex");
  req.session.ssoState = state;

  const authorizationUrl = workos.sso.getAuthorizationUrl({
    organization,
    clientId: config.workosClientId,
    redirectUri: config.redirectUri,
    state,
  });

  res.redirect(authorizationUrl);
});

ssoRouter.get("/sso/callback", async (req, res) => {
  // WorkOS reports failures (no active connection, IdP error, etc.) as
  // ?error=...&error_description=... instead of a code.
  if (typeof req.query.error === "string") {
    const description =
      typeof req.query.error_description === "string" ? req.query.error_description : "";
    res.status(400).render("error", {
      title: "Sign-in failed",
      status: 400,
      message: `SSO error: ${req.query.error}${description ? ` — ${description}` : ""}`,
      hint: 'If this organization has no active SSO connection yet, open its page and use "Set up SSO" to configure one through the Admin Portal.',
    });
    return;
  }

  const expectedState = req.session.ssoState;
  delete req.session.ssoState;

  if (!expectedState || req.query.state !== expectedState) {
    res.status(400).render("error", {
      title: "Sign-in failed",
      status: 400,
      message: "State mismatch on the SSO callback.",
      hint: "Start the sign-in from this app again. If it keeps happening, check that your browser allows cookies for localhost.",
    });
    return;
  }

  if (typeof req.query.code !== "string") {
    res.status(400).render("error", {
      title: "Sign-in failed",
      status: 400,
      message: "Missing authorization code on the SSO callback.",
    });
    return;
  }

  const { profile } = await workos.sso.getProfileAndToken({
    code: req.query.code,
    clientId: config.workosClientId,
  });

  // Rotate the session id at the privilege boundary (prevents session
  // fixation), then record the profile — this app's whole "session" is the
  // profile WorkOS returned.
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
  req.session.profile = profile;

  res.redirect("/profile");
});

ssoRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});
