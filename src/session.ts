import type { Profile } from "@workos-inc/node";
import type { NextFunction, Request, Response } from "express";

declare module "express-session" {
  interface SessionData {
    profile?: Profile<Record<string, unknown>>;
    ssoState?: string;
  }
}

export function requireProfile(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.profile) {
    res.redirect("/");
    return;
  }
  next();
}
