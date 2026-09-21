import { createHmac, timingSafeEqual } from "node:crypto";
import { json, validSupportSession } from "../lib/support-payments.mjs";

export function verifyStripeSignature(body, header, secret, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = header.split(",").map(part => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  if (!/^\d+$/.test(timestamp || "") || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest();
  return parts.some(([key, signature]) => key === "v1" && /^[a-f0-9]{64}$/i.test(signature || "")
    && timingSafeEqual(expected, Buffer.from(signature, "hex")));
}

export default {
  async fetch(request) {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return json({ error: "webhook_unavailable" }, 503);
    if (Number(request.headers.get("content-length")) > 262144) return json({ error: "request_too_large" }, 413);
    const body = await request.text();
    if (body.length > 262144) return json({ error: "request_too_large" }, 413);
    if (!verifyStripeSignature(body, request.headers.get("stripe-signature"), secret)) {
      return json({ error: "invalid_signature" }, 400);
    }
    let event;
    try { event = JSON.parse(body); } catch { return json({ error: "invalid_event" }, 400); }
    if (process.env.VERCEL_ENV === "production" && event?.livemode !== true) {
      return json({ error: "test_event_on_live_site" }, 400);
    }
    if (process.env.VERCEL_ENV !== "production" && event?.livemode !== false) {
      return json({ error: "live_event_on_test_site" }, 400);
    }
    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"].includes(event?.type)) {
      return json({ received: true });
    }
    const session = event.data?.object;
    // The Stripe account may also serve other sites. Ignore their events.
    if (session?.metadata?.project !== "kids-love-color") return json({ received: true });
    if (!validSupportSession(session)) return json({ error: "invalid_support_session" }, 400);
    // No delivery, entitlement or email is triggered here, so repeated events are safe.
    // Stripe remains the payment ledger. Do not store personal payer data in this repo.
    const state = session.payment_status === "paid" ? "paid" : "not_paid";
    console.info(`Stripe support ${event.id}: ${state}`);
    return json({ received: true });
  },
};
