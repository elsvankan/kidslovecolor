import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import createPayment from "../api/create-payment.mjs";
import paymentStatus from "../api/payment-status.mjs";
import webhook, { verifyStripeSignature } from "../api/stripe-webhook.mjs";
import { SUPPORT_COPY, validCheckoutUrl, supportOption, stripeSecret, mollieSecret, stripePaymentMethods } from "../lib/support-payments.mjs";

const origin = "https://www.kidslovecolor.com";
const sessionId = "cs_test_abcdefghijklmnopqrstuvwxyz";
const requestId = "161a0b27-af75-44e0-b810-f135702bb960";
const secret = "whsec_testOnlyNotARealSecret";
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const envKeys = ["SUPPORT_PAYMENT_PROVIDER", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "MOLLIE_API_KEY", "VERCEL_ENV", "STRIPE_ENABLE_WECHAT_PAY"];
const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
const request = (data = {}, headers = {}) => new Request(origin + "/api/create-payment", {
  method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...headers },
  body: JSON.stringify({ support: "coffee", lang: "nl", requestId, ...data }),
});
function session(overrides = {}) {
  return { id: sessionId, object: "checkout.session", mode: "payment", currency: "eur",
    amount_total: 300, payment_status: "paid", status: "complete",
    metadata: { project: "kids-love-color", support: "coffee" }, ...overrides };
}
function signedRequest(event, signatureOverride) {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(timestamp + "." + body).digest("hex");
  return new Request(origin + "/api/stripe-webhook", { method: "POST", body,
    headers: { "Stripe-Signature": signatureOverride || "t=" + timestamp + ",v1=" + signature } });
}
beforeEach(() => {
  for (const key of envKeys) delete process.env[key];
  process.env.STRIPE_SECRET_KEY = "sk_test_fakeLocalTests";
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.MOLLIE_API_KEY = "test_fakeLocalTests";
  globalThis.fetch = async () => { throw new Error("Unexpected provider call"); };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key];
  }
});

test("Mollie remains the default; existing amounts and webhook stay intact", async () => {
  let payload;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.mollie.com/v2/payments");
    payload = JSON.parse(options.body);
    return response({ _links: { checkout: { href: "https://www.mollie.com/checkout/test" } } });
  };
  const result = await createPayment.fetch(request({ support: "bubble", amount: 1, lang: "en" }));
  assert.equal(result.status, 200);
  assert.deepEqual(payload.amount, { value: "5.00", currency: "EUR" });
  assert.equal(payload.description, "Steun KidsLoveColor — een ijsje");
  assert.equal(payload.webhookUrl, origin + "/api/mollie-webhook");
  assert.match(payload.redirectUrl, /\/en\?donation=thanks/);
  assert.match(payload.cancelUrl, /\/en\?donation=cancelled/);
  assert.equal((await result.json()).provider, "mollie");
});

test("Stripe: fixed amounts, one-time mode, safe methods and all five languages", async () => {
  process.env.SUPPORT_PAYMENT_PROVIDER = "stripe";
  for (const lang of ["nl", "en", "fr", "es", "zh"]) {
    for (const [support, amount] of [["coffee", "300"], ["bubble", "500"]]) {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
        const p = new URLSearchParams(options.body);
        assert.equal(p.get("line_items[0][price_data][unit_amount]"), amount);
        assert.equal(p.get("line_items[0][price_data][currency]"), "eur");
        assert.equal(p.get("line_items[0][quantity]"), "1");
        assert.equal(p.get("line_items[0][price_data][product_data][name]"), SUPPORT_COPY[lang][support]);
        assert.equal(p.get("line_items[0][price_data][product_data][description]"), SUPPORT_COPY[lang].description);
        assert.equal(p.get("mode"), "payment");
        assert.equal(p.get("locale"), lang);
        assert.equal(p.get("payment_method_types[0]"), "card");
        assert.equal(p.get("payment_method_types[1]"), null);
        assert.equal(p.get("metadata[project]"), "kids-love-color");
        assert.equal(p.get("metadata[support]"), support);
        assert.match(p.get("success_url"), /support-return\?provider=stripe/);
        assert.ok(p.get("success_url").includes("{CHECKOUT_SESSION_ID}"));
        assert.ok(p.get("cancel_url").startsWith(origin + (lang === "nl" ? "/" : "/" + lang)));
        assert.equal(options.headers["Idempotency-Key"], "klc-support-v1-" + support + "-" + lang + "-" + requestId);
        return response({ url: "https://checkout.stripe.com/c/pay/test" });
      };
      const result = await createPayment.fetch(request({ lang, support, amount: 1, currency: "usd" }));
      assert.equal(result.status, 200);
      assert.equal((await result.json()).provider, "stripe");
    }
  }
});

test("China-native method stays disabled unless explicitly switched on; Alipay is never offered", async () => {
  process.env.SUPPORT_PAYMENT_PROVIDER = "stripe";
  assert.deepEqual(stripePaymentMethods(), ["card"]);
  process.env.STRIPE_ENABLE_WECHAT_PAY = "TRUE";
  assert.deepEqual(stripePaymentMethods(), ["card"]);
  process.env.STRIPE_ENABLE_WECHAT_PAY = "true";
  assert.deepEqual(stripePaymentMethods(), ["card", "wechat_pay"]);
  globalThis.fetch = async (_, options) => {
    const p = new URLSearchParams(options.body);
    assert.equal(p.get("payment_method_types[0]"), "card");
    assert.equal(p.get("payment_method_types[1]"), "wechat_pay");
    assert.equal(p.get("payment_method_types[2]"), null);
    assert.ok(!options.body.includes("alipay"));
    return response({ url: "https://checkout.stripe.com/c/pay/test" });
  };
  assert.equal((await createPayment.fetch(request())).status, 200);
});

test("Reject invalid methods, cross-site calls, unknown support and inherited properties", async () => {
  assert.equal((await createPayment.fetch(new Request(origin + "/api/create-payment"))).status, 405);
  assert.equal((await createPayment.fetch(request({}, { Origin: "https://other.example" }))).status, 403);
  assert.equal((await createPayment.fetch(request({}, { "sec-fetch-site": "cross-site" }))).status, 403);
  assert.equal((await createPayment.fetch(request({}, { "Content-Type": "text/plain" }))).status, 415);
  for (const support of ["toString", "__proto__", "other", ["coffee"], 3]) {
    assert.equal((await createPayment.fetch(request({ support }))).status, 400);
    assert.equal(supportOption(support), null);
  }
  assert.equal((await createPayment.fetch(request({ requestId: "malformed" }))).status, 400);
  assert.equal((await createPayment.fetch(request({ extra: "x".repeat(5000) }))).status, 413);
  assert.equal((await createPayment.fetch(new Request(origin + "/api/create-payment", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad",
  }))).status, 400);
});

test("Missing configuration and sandbox keys on production fail closed", async () => {
  delete process.env.MOLLIE_API_KEY;
  assert.equal((await createPayment.fetch(request())).status, 503);
  process.env.SUPPORT_PAYMENT_PROVIDER = "stripe";
  process.env.VERCEL_ENV = "production";
  assert.equal((await createPayment.fetch(request())).status, 503);
  delete process.env.STRIPE_SECRET_KEY;
  assert.equal((await createPayment.fetch(request())).status, 503);
  process.env.SUPPORT_PAYMENT_PROVIDER = "not-a-provider";
  assert.equal((await createPayment.fetch(request())).status, 503);
});

test("Production Stripe returns to the canonical website; request cannot inject URLs", async () => {
  process.env.SUPPORT_PAYMENT_PROVIDER = "stripe";
  process.env.VERCEL_ENV = "production";
  process.env.STRIPE_SECRET_KEY = "sk_live_fakeLocalTests";
  globalThis.fetch = async (_, options) => {
    const data = new URLSearchParams(options.body);
    assert.ok(data.get("success_url").startsWith(origin + "/support-return?"));
    assert.ok(!options.body.includes("evil.example"));
    return response({ url: "https://checkout.stripe.com/c/pay/test" });
  };
  assert.equal((await createPayment.fetch(request({ success_url: "https://evil.example", lang: "__proto__" }))).status, 200);
});

test("Live and sandbox keys are isolated in production, preview and local environments", () => {
  for (const env of [undefined, "development", "preview", "production"]) {
    if (env) process.env.VERCEL_ENV = env; else delete process.env.VERCEL_ENV;
    for (const prefix of ["sk", "rk"]) {
      for (const mode of ["test", "live"]) {
        const key = prefix + "_" + mode + "_fakeLocalTests";
        process.env.STRIPE_SECRET_KEY = key;
        assert.equal(stripeSecret(), mode === (env === "production" ? "live" : "test") ? key : null);
      }
    }
  }
});

test("Mollie live and test keys are isolated before any provider request", async () => {
  for (const env of [undefined, "development", "preview", "production"]) {
    if (env) process.env.VERCEL_ENV = env; else delete process.env.VERCEL_ENV;
    for (const mode of ["test", "live"]) {
      const key = mode + "_fakeLocalTests";
      process.env.MOLLIE_API_KEY = key;
      const allowed = mode === (env === "production" ? "live" : "test");
      assert.equal(mollieSecret(), allowed ? key : null);
      let called = false;
      globalThis.fetch = async (url, options) => {
        called = true;
        assert.equal(url, "https://api.mollie.com/v2/payments");
        assert.equal(options.headers.Authorization, "Bearer " + key);
        return response({ _links: { checkout: { href: "https://www.mollie.com/checkout/test" } } });
      };
      const result = await createPayment.fetch(request());
      assert.equal(result.status, allowed ? 200 : 503);
      assert.equal(called, allowed);
      if (!allowed) assert.deepEqual(await result.json(), { error: "payment_unavailable" });
    }
  }
  for (const key of ["", "live_", "test_", "unknown_fake", "live_has space", "live_has\nnewline"]) {
    process.env.MOLLIE_API_KEY = key;
    assert.equal(mollieSecret(), null);
  }
});

test("Provider failure, invalid JSON and unsafe redirects are contained", async () => {
  process.env.SUPPORT_PAYMENT_PROVIDER = "stripe";
  for (const failure of [
    async () => response({ error: "not public" }, 400),
    async () => { throw new Error("offline"); },
    async () => new Response("not json"),
    async () => response({ url: "https://evil.example/checkout" }),
    async () => response({}),
  ]) {
    globalThis.fetch = failure;
    const result = await createPayment.fetch(request());
    assert.equal(result.status, 502);
    assert.deepEqual(await result.json(), { error: "payment_unavailable" });
  }
  for (const value of ["javascript:alert(1)", "http://checkout.stripe.com", "https://checkout.stripe.com.evil.example", "https://user:pass@checkout.stripe.com"]) {
    assert.equal(validCheckoutUrl(value, "stripe"), false);
  }
});

test("Status only returns verified, minimal payment state without personal data", async () => {
  for (const [extra, expected] of [
    [{}, "paid"],
    [{ payment_status: "unpaid", status: "open" }, "pending"],
    [{ payment_status: "unpaid", status: "expired" }, "expired"],
  ]) {
    globalThis.fetch = async () => response(session({ customer_details: { email: "private@example.test" }, ...extra }));
    const result = await paymentStatus.fetch(new Request(origin + "/api/payment-status?session_id=" + sessionId));
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.deepEqual(await result.json(), { status: expected });
  }
});

test("Fake, unrelated, wrong-value and wrong-environment sessions are rejected", async () => {
  assert.equal((await paymentStatus.fetch(new Request(origin + "/api/payment-status?session_id=../secret"))).status, 400);
  assert.equal((await paymentStatus.fetch(new Request(origin + "/api/payment-status?session_id=cs_live_abcdefghijklmnopqrstuvwxyz"))).status, 400);
  for (const extra of [
    { amount_total: 1 }, { currency: "usd" }, { mode: "subscription" },
    { metadata: { project: "other", support: "coffee" } },
    { metadata: { project: "kids-love-color", support: "__proto__" } },
    { id: "cs_test_someOtherSession" },
  ]) {
    globalThis.fetch = async () => response(session(extra));
    assert.equal((await paymentStatus.fetch(new Request(origin + "/api/payment-status?session_id=" + sessionId))).status, 404);
  }
});

test("Webhook signatures cover the raw body and have a five-minute tolerance", () => {
  const body = '{"id":"evt_test"}';
  const timestamp = 1800000000;
  const digest = createHmac("sha256", secret).update(timestamp + "." + body).digest("hex");
  const header = "t=" + timestamp + ",v1=" + digest;
  assert.equal(verifyStripeSignature(body, header, secret, timestamp * 1000), true);
  assert.equal(verifyStripeSignature(body, header + ",v1=" + "0".repeat(64), secret, timestamp * 1000), true);
  assert.equal(verifyStripeSignature(body + " ", header, secret, timestamp * 1000), false);
  assert.equal(verifyStripeSignature(body, header, secret, (timestamp + 301) * 1000), false);
  assert.equal(verifyStripeSignature(body, header, secret, (timestamp - 301) * 1000), false);
  assert.equal(verifyStripeSignature(body, "t=" + timestamp + ",v1=nope", secret, timestamp * 1000), false);
  assert.equal(verifyStripeSignature(body, header, "", timestamp * 1000), false);
});

test("Webhook authenticates events, scopes amounts, tolerates duplicates and rejects sandbox in production", async () => {
  const event = { id: "evt_localTest", type: "checkout.session.completed", livemode: false, data: { object: session() } };
  assert.equal((await webhook.fetch(signedRequest(event))).status, 200);
  assert.equal((await webhook.fetch(signedRequest(event))).status, 200);
  assert.equal((await webhook.fetch(signedRequest({ ...event, livemode: true }))).status, 400);
  assert.equal((await webhook.fetch(signedRequest(event, "t=1,v1=bad"))).status, 400);
  assert.equal((await webhook.fetch(signedRequest({ ...event, data: { object: session({ amount_total: 1 }) } }))).status, 400);
  assert.equal((await webhook.fetch(signedRequest({ ...event, data: { object: session({ metadata: { project: "other" } }) } }))).status, 200);
  assert.equal((await webhook.fetch(signedRequest({ ...event, type: "customer.created" }))).status, 200);
  process.env.VERCEL_ENV = "production";
  assert.equal((await webhook.fetch(signedRequest(event))).status, 400);
  assert.equal((await webhook.fetch(signedRequest({ ...event, livemode: true }))).status, 200);
  delete process.env.STRIPE_WEBHOOK_SECRET;
  assert.equal((await webhook.fetch(signedRequest(event))).status, 503);
});

const clientScript = readFileSync(new URL("../js/support-payments.js", import.meta.url), "utf8");
function fakeElement() {
  return { textContent: "", hidden: false, disabled: false, dataset: {}, attributes: {}, listeners: {},
    classList: { add() {} },
    addEventListener(name, fn) { this.listeners[name] = fn; },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
}
function client({ lang = "nl", search = "", returnPage = false, providerResult = { status: "paid" }, ok = true, storage = new Map(), support = "coffee" } = {}) {
  const elements = Object.fromEntries(["paymentStatus", "paymentTitle", "paymentRetry", "paymentBack", "supportNote"].map(id => [id, fakeElement()]));
  const button = fakeElement(); button.dataset.support = support;
  const analytics = [];
  let replaced, assigned, submitted, requested;
  const context = {
    URL, URLSearchParams, AbortSignal,
    document: { readyState: "complete", title: "", documentElement: { lang },
      getElementById(id) { return id === "paymentStatus" && !returnPage ? null : elements[id]; },
      querySelectorAll() { return [button]; } },
    window: { location: { search, assign(value) { assigned = value; } },
      gtag(...args) { analytics.push(args); },
      sessionStorage: { getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, value); }, removeItem(key) { storage.delete(key); } },
      history: { replaceState(_a, _b, value) { replaced = value; } },
      crypto: { randomUUID() { return requestId; } }, addEventListener() {} },
    fetch: async (url, options) => { requested = url; submitted = options?.body; return { ok, json: async () => providerResult }; },
  };
  runInNewContext(clientScript, context);
  return { elements, button, context, analytics, replaced: () => replaced, assigned: () => assigned, submitted: () => submitted, requested: () => requested };
}

test("Return-page refresh can recheck a tab-scoped session for at most 30 minutes", async () => {
  const storage = new Map();
  client({ returnPage: true, search: "?session_id=" + sessionId, storage });
  const saved = JSON.parse(storage.get("klc-support-return"));
  assert.equal(saved.id, sessionId);
  assert.ok(saved.expires > Date.now() && saved.expires <= Date.now() + 30 * 60 * 1000);
  const refreshed = client({ returnPage: true, storage });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(refreshed.requested(), "/api/payment-status?session_id=" + sessionId);
  assert.match(refreshed.elements.paymentTitle.textContent, /Dankjewel/);
  storage.set("klc-support-return", JSON.stringify({ id: sessionId, expires: Date.now() - 1 }));
  const expired = client({ returnPage: true, storage });
  assert.equal(expired.requested(), undefined);
  assert.equal(storage.size, 0);
  storage.set("klc-support-return", JSON.stringify(saved));
  const invalid = client({ returnPage: true, search: "?session_id=invalid", storage });
  assert.equal(invalid.requested(), undefined);
  assert.equal(storage.size, 0);
});

test("Return page localizes all five languages, strips session IDs and only celebrates verified success", async () => {
  for (const lang of ["nl", "en", "fr", "es", "zh"]) {
    const c = client({ returnPage: true, search: "?lang=" + lang + "&session_id=" + sessionId });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(c.context.document.documentElement.lang, lang);
    assert.equal(c.replaced(), "/support-return?lang=" + lang);
    assert.equal(c.elements.paymentBack.href, (lang === "nl" ? "/" : "/" + lang) + "#steun-ons");
    assert.equal(c.elements.paymentRetry.hidden, true);
    assert.ok(c.elements.paymentStatus.textContent.length > 10);
  }
  const missing = client({ returnPage: true });
  assert.match(missing.elements.paymentTitle.textContent, /niet bevestigen/);
  for (const status of ["pending", "expired", "madeup"]) {
    const c = client({ returnPage: true, search: "?session_id=" + sessionId, providerResult: { status } });
    await new Promise(resolve => setImmediate(resolve));
    assert.doesNotMatch(c.elements.paymentTitle.textContent, /Dankjewel/);
  }
  const failed = client({ returnPage: true, search: "?session_id=" + sessionId, ok: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.doesNotMatch(failed.elements.paymentTitle.textContent, /Dankjewel/);
});

test("Buttons pass language and idempotency; API errors and unsafe destinations re-enable them", async () => {
  const c = client({ lang: "en", providerResult: { checkoutUrl: "https://checkout.stripe.com/c/pay/test", provider: "stripe" } });
  await c.button.listeners.click();
  assert.equal(c.assigned(), "https://checkout.stripe.com/c/pay/test");
  assert.deepEqual(JSON.parse(c.submitted()), { support: "coffee", lang: "en", requestId });
  assert.deepEqual(c.analytics.map(([, name]) => name), ["support_coffee_click", "support_coffee_checkout_open"]);
  assert.equal(c.analytics[0][2].value, 3);
  assert.equal(c.analytics[1][2].payment_provider, "stripe");
  const iceCream = client({ support: "bubble", lang: "zh", providerResult: { checkoutUrl: "https://www.mollie.com/checkout/test", provider: "mollie" } });
  await iceCream.button.listeners.click();
  assert.deepEqual(iceCream.analytics.map(([, name]) => name), ["support_icecream_click", "support_icecream_checkout_open"]);
  assert.equal(iceCream.analytics[0][2].value, 5);
  assert.equal(iceCream.analytics[1][2].payment_provider, "mollie");
  for (const config of [{ ok: false }, { providerResult: { checkoutUrl: "https://evil.example" } }]) {
    const bad = client(config);
    await bad.button.listeners.click();
    assert.equal(bad.button.disabled, false);
    assert.equal(bad.assigned(), undefined);
    assert.match(bad.elements.supportNote.textContent, /lukt nu even niet/);
    assert.deepEqual(bad.analytics.map(([, name]) => name), ["support_coffee_click", "support_coffee_error"]);
  }
});

test("Each localized home uses one shared payment handler; return page has no analytics", () => {
  for (const path of ["index.html", "en/index.html", "fr/index.html", "es/index.html", "zh/index.html"]) {
    const html = readFileSync(new URL("../" + path, import.meta.url), "utf8");
    assert.equal((html.match(/src="\/js\/support-payments.js/g) || []).length, 1);
    assert.equal((html.match(/fetch\('\/api\/create-payment'/g) || []).length, 0);
    assert.equal((html.match(/data-support="coffee"/g) || []).length, 1);
    assert.equal((html.match(/data-support="bubble"/g) || []).length, 1);
  }
  const html = readFileSync(new URL("../support-return.html", import.meta.url), "utf8");
  assert.ok(html.includes('content="noindex, nofollow"'));
  assert.ok(html.includes('name="referrer" content="no-referrer"'));
  assert.ok(!/googletagmanager|gtag\(|google-analytics/.test(html));
});

test("Ice cream replaces the support treat in all five languages without changing amounts or IDs", () => {
  const words = { nl: "ijsje", en: "ice cream", fr: "glace", es: "helado", zh: "冰淇淋" };
  for (const [lang, word] of Object.entries(words)) {
    const path = lang === "nl" ? "index.html" : lang + "/index.html";
    const html = readFileSync(new URL("../" + path, import.meta.url), "utf8");
    const card = html.match(/<button\b[^>]*data-support="bubble"[^>]*>[\s\S]*?<\/button>/)?.[0];
    assert.ok(card, "Existing payment identifier is retained: " + lang);
    assert.ok(card.includes("€5") && card.includes("🍦") && card.includes(word));
    assert.doesNotMatch(card, /bubble tea|té de burbujas|珍珠奶茶|🧋/i);
    assert.ok(SUPPORT_COPY[lang].bubble.includes(word));
    assert.doesNotMatch(SUPPORT_COPY[lang].bubble, /bubble tea|té de burbujas|珍珠奶茶/i);
  }
  assert.equal(supportOption("bubble").cents, 500);
  assert.equal(supportOption("coffee").cents, 300);
});
