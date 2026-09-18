import { json, stripeSecret, validSupportSession, sessionStatus } from "../lib/support-payments.mjs";

export default {
  async fetch(request) {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
    const id = new URL(request.url).searchParams.get("session_id") || "";
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) return json({ error: "invalid_session" }, 400);
    const key = stripeSecret();
    if (!key) return json({ error: "payment_unavailable" }, 503);
    if (id.startsWith("cs_live_") !== /^(sk|rk)_live_/.test(key)) return json({ error: "invalid_session" }, 400);
    try {
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return json({ error: "status_unavailable" }, response.status === 404 ? 404 : 502);
      const session = await response.json();
      if (session.id !== id || !validSupportSession(session)) return json({ error: "invalid_session" }, 404);
      // Return no names, emails, payment details or full Stripe objects.
      return json({ status: sessionStatus(session) });
    } catch {
      return json({ error: "status_unavailable" }, 502);
    }
  },
};
