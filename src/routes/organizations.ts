import { DomainDataState } from "@workos-inc/node";
import { Router } from "express";
import { workos } from "../workos.js";
import { config } from "../config.js";

export const organizationsRouter = Router();

organizationsRouter.post("/", async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const domain = typeof req.body.domain === "string" ? req.body.domain.trim() : "";

  if (!name) {
    res.status(400).render("error", {
      title: "Error",
      status: 400,
      message: "Organization name is required.",
    });
    return;
  }

  const organization = await workos.organizations.createOrganization({
    name,
    // Associating the customer's email domain lets WorkOS route users to this
    // organization's connection and directory.
    ...(domain ? { domainData: [{ domain, state: DomainDataState.Pending }] } : {}),
  });

  res.redirect(`/organizations/${organization.id}`);
});

organizationsRouter.get("/:id", async (req, res) => {
  const [organization, directories] = await Promise.all([
    workos.organizations.getOrganization(req.params.id),
    workos.directorySync.listDirectories({ organizationId: req.params.id }),
  ]);

  res.render("organization", {
    title: organization.name,
    organization,
    directories: directories.data,
  });
});

// Generates a single-use Admin Portal link and sends the browser there.
// In a real app you would email this link to your customer's IT admin — the
// portal is where they configure their own IdP or directory, so you never
// have to collect SAML metadata or SCIM credentials yourself.
organizationsRouter.post("/:id/portal", async (req, res) => {
  const intent = req.body.intent;

  if (intent !== "sso" && intent !== "dsync") {
    res.status(400).render("error", {
      title: "Error",
      status: 400,
      message: 'Portal intent must be "sso" or "dsync".',
    });
    return;
  }

  const { link } = await workos.adminPortal.generateLink({
    organization: req.params.id,
    intent,
    returnUrl: `${config.baseUrl}/organizations/${req.params.id}`,
  });

  res.redirect(link);
});
