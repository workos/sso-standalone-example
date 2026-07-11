import path from "node:path";
import express from "express";
import session from "express-session";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { homeRouter } from "./routes/home.js";
import { organizationsRouter } from "./routes/organizations.js";
import { directoryRouter } from "./routes/directory.js";
import { ssoRouter } from "./routes/sso.js";
import { webhooksRouter } from "./routes/webhooks.js";

export function createApp(): express.Express {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(import.meta.dirname, "views"));

  app.use(express.static(path.join(import.meta.dirname, "public")));

  // Demo-only session setup: the default in-memory store loses sessions on
  // restart and doesn't scale past one process — use a shared store (e.g.
  // connect-redis) in production, and set cookie.secure (plus
  // app.set('trust proxy', 1) behind a proxy) once you're serving over HTTPS.
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // 'lax', not 'strict': the SSO callback arrives as a top-level GET
        // redirect from WorkOS, and 'strict' would drop the session cookie on
        // that navigation — breaking the state check.
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
      },
    }),
  );

  // Parses HTML form posts. There is deliberately no global express.json():
  // the webhook route needs the raw request body to verify the
  // WorkOS-Signature header, so it attaches express.raw() itself.
  app.use(express.urlencoded({ extended: false }));

  // Make the signed-in profile (and a default title) available to every view.
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.profile = req.session.profile ?? null;
    res.locals.title = "WorkOS example";
    next();
  });

  app.use("/", homeRouter);
  app.use("/organizations", organizationsRouter);
  app.use("/organizations", directoryRouter);
  app.use("/auth", ssoRouter);
  app.use("/webhooks", webhooksRouter);

  app.use((req: Request, res: Response) => {
    res.status(404).render("error", {
      title: "Not found",
      status: 404,
      message: `No route for ${req.method} ${req.path}`,
    });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    console.error(err);
    const status = hasNumericStatus(err) ? err.status : 500;
    const message = err instanceof Error ? err.message : "Something went wrong.";
    res.status(status).render("error", { title: "Error", status, message });
  });

  return app;
}

// WorkOS SDK errors carry the HTTP status of the failed API call.
function hasNumericStatus(err: unknown): err is { status: number } {
  return (
    typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
  );
}
