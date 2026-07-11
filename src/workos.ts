import { WorkOS } from "@workos-inc/node";
import { config } from "./config.js";

export const workos = new WorkOS({
  apiKey: config.workosApiKey,
  clientId: config.workosClientId,
});
