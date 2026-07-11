import express, { Router } from "express";
import { workos } from "../workos.js";
import { config } from "../config.js";
import { listReceivedEvents, recordEvent } from "../event-log.js";

export const webhooksRouter = Router();

// express.raw() is attached here, on this route only: signature verification
// hashes the exact bytes WorkOS sent, so the body must not go through a JSON
// parser first.
webhooksRouter.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  if (!config.workosWebhookSecret) {
    res.status(501).send("WORKOS_WEBHOOK_SECRET is not configured");
    return;
  }

  const sigHeader = req.header("WorkOS-Signature");
  if (!sigHeader) {
    res.status(400).send("Missing WorkOS-Signature header");
    return;
  }

  try {
    const event = await workos.webhooks.constructEvent({
      payload: req.body,
      sigHeader,
      secret: config.workosWebhookSecret,
    });

    recordEvent({
      id: event.id,
      event: event.event,
      receivedAt: new Date().toISOString(),
      data: event.data,
    });

    res.sendStatus(200);
  } catch (err) {
    console.warn("Webhook rejected:", err instanceof Error ? err.message : err);
    // 400 (not 500) — the payload failed verification; WorkOS retries
    // deliveries that don't get a 2xx.
    res.status(400).send("Signature verification failed");
  }
});

webhooksRouter.get("/", (req, res) => {
  res.render("events", {
    title: "Webhook events",
    events: listReceivedEvents(),
    webhookConfigured: Boolean(config.workosWebhookSecret),
  });
});
