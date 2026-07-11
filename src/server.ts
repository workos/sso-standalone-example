import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Listening on ${config.baseUrl}`);
  console.log(`SSO redirect URI: ${config.redirectUri}`);
  if (!config.workosWebhookSecret) {
    console.log("WORKOS_WEBHOOK_SECRET is not set — webhook verification is disabled.");
  }
});
