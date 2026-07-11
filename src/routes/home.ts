import { Router } from "express";
import { workos } from "../workos.js";
import { requireProfile } from "../session.js";

export const homeRouter = Router();

// The organization pages are the SaaS operator's side of the demo and are
// intentionally unauthenticated. In a real app they'd sit behind your
// existing authentication — standalone SSO assumes you already have one.
homeRouter.get("/", async (req, res) => {
  // First page is plenty for a demo — listOrganizations paginates via
  // listMetadata.after cursors.
  const organizations = await workos.organizations.listOrganizations({ limit: 20 });
  res.render("home", {
    title: "Organizations",
    organizations: organizations.data,
  });
});

homeRouter.get("/profile", requireProfile, (req, res) => {
  // The signed-in profile itself comes from res.locals (set in app.ts).
  res.render("profile", { title: "Profile" });
});
