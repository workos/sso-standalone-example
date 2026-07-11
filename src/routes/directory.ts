import { Router } from "express";
import { workos } from "../workos.js";

export const directoryRouter = Router();

directoryRouter.get("/:id/directory", async (req, res) => {
  const organizationId = req.params.id;

  const [organization, directories] = await Promise.all([
    workos.organizations.getOrganization(organizationId),
    workos.directorySync.listDirectories({ organizationId }),
  ]);

  const directory =
    directories.data.find((candidate) => candidate.id === req.query.directory) ??
    directories.data[0];

  if (!directory) {
    res.render("directory", {
      title: "Directory",
      organization,
      directories: [],
      directory: null,
      users: [],
      groups: [],
      hasMore: false,
    });
    return;
  }

  // First page of each is plenty for a demo. For a full sync, follow
  // listMetadata.after cursors (or use .autoPagination()).
  const [users, groups] = await Promise.all([
    workos.directorySync.listUsers({ directory: directory.id }),
    workos.directorySync.listGroups({ directory: directory.id }),
  ]);

  res.render("directory", {
    title: `${organization.name} directory`,
    organization,
    directories: directories.data,
    directory,
    users: users.data,
    groups: groups.data,
    hasMore: Boolean(users.listMetadata.after) || Boolean(groups.listMetadata.after),
  });
});
