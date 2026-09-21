import { randomUUID } from "node:crypto";
import {
  SUPPORT_COPY, homePath, json, mollieSecret, stripeSecret, supportLanguage,
  supportOption, stripePaymentMethods, validCheckoutUrl,
} from "../lib/support-payments.mjs";

const unavailable = (status = 503) => json({ error: "payment_unavailable" }, status);

export default {
  async fetch(request) {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
    const requestUrl = new URL(request.url);
    const origin = request.headers.get("origin");
    if ((origin && origin !== requestUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
      return json({ error: "invalid_origin" }, 403);
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json({ error: "invalid_content_type" }, 415);
    }
    let payload;
    try {
      if (Number(request.headers.get("content-length")) > 4096) return json({ error: "request_too_large" }, 413);
      const body = await request.text();
      if (body.length > 4096) return json({ error: "request_too_large" }, 413);
      payload = JSON.parse(body);
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
    const option = supportOption(payload?.support);
    if (!option) return json({ error: "invalid_support" }, 400);
    if (payload.requestId !== undefined && (typeof payload.requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(payload.requestId))) {
      return json({ error: "invalid_request_id" }, 400);
    }
    const lang = supportLanguage(payload.lang);
    const provider = (process.env.SUPPORT_PAYMENT_PROVIDER || "mollie").trim();
    if (!["stripe", "mollie"].includes(provider)) return unavailable();
    const apiKey = provider === "stripe" ? stripeSecret() : mollieSecret();
    if (!apiKey) return unavailable();

    const returnBase = process.env.VERCEL_ENV === "production" ? "https://www.kidslovecolor.com" : requestUrl.origin;
    const home = returnBase + homePath(lang);
    const cancelUrl = home + "?donation=cancelled#steun-ons";
    const headers = { Authorization: "Bearer " + apiKey };
    let endpoint;
    let body;

    if (provider === "stripe") {
      endpoint = "https://api.stripe.com/v1/checkout/sessions";
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      headers["Idempotency-Key"] = "klc-support-v1-" + payload.support + "-" + lang + "-" + (payload.requestId || randomUUID());
      const copy = SUPPORT_COPY[lang];
      body = new URLSearchParams({
        mode: "payment",
        locale: lang,
        "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][unit_amount]": String(option.cents),
        "line_items[0][price_data][product_data][name]": copy[payload.support],
        "line_items[0][price_data][product_data][description]": copy.description,
        "line_items[0][quantity]": "1",
        "metadata[project]": "kids-love-color",
        "metadata[support]": payload.support,
        "metadata[lang]": lang,
        "payment_intent_data[metadata][project]": "kids-love-color",
        "payment_intent_data[metadata][support]": payload.support,
        "payment_intent_data[description]": copy[payload.support],
        success_url: returnBase + "/support-return?provider=stripe&lang=" + lang + "&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: cancelUrl,
      });
      stripePaymentMethods().forEach((method, index) => {
        body.set(`payment_method_types[${index}]`, method);
      });
      body = body.toString();
    } else {
      endpoint = "https://api.mollie.com/v2/payments";
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({
        amount: { currency: "EUR", value: (option.cents / 100).toFixed(2) },
        description: option.mollieDescription,
        redirectUrl: home + "?donation=thanks&support=" + payload.support + "#steun-ons",
        cancelUrl,
        webhookUrl: returnBase + "/api/mollie-webhook",
        metadata: { project: "kids-love-color", support: payload.support },
      });
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST", headers, body, signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        // Never log provider response bodies: they can include personal data.
        console.error(provider + " checkout returned HTTP " + response.status);
        return unavailable(502);
      }
      const payment = await response.json();
      const checkoutUrl = provider === "stripe" ? payment.url : payment?._links?.checkout?.href;
      if (!validCheckoutUrl(checkoutUrl, provider)) return unavailable(502);
      return json({ checkoutUrl, provider });
    } catch {
      console.error(provider + " checkout could not be started");
      return unavailable(502);
    }
  },
};
