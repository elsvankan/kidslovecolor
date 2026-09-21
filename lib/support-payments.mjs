// Amounts are controlled here, never by the browser.
export const SUPPORT_OPTIONS = Object.freeze({
  coffee: Object.freeze({ cents: 300, mollieDescription: "Kop koffie voor Kids Love Color" }),
  // Retain the existing identifier for open tabs and earlier payment metadata.
  bubble: Object.freeze({ cents: 500, mollieDescription: "Steun KidsLoveColor — een ijsje" }),
});

export const SUPPORT_COPY = Object.freeze({
  nl: {
    coffee: "Steun KidsLoveColor — een koffie",
    bubble: "Steun KidsLoveColor — een ijsje",
    description: "Een vrijwillige, eenmalige bijdrage voor onze gratis kleurplaten. Dit is geen aankoop van eten of drinken en geen abonnement.",
  },
  en: {
    coffee: "Support KidsLoveColor — a coffee",
    bubble: "Support KidsLoveColor — an ice cream",
    description: "An optional, one-time contribution for our free coloring pages. This is not a purchase of food or drinks or a subscription.",
  },
  fr: {
    coffee: "Soutenir KidsLoveColor — un café",
    bubble: "Soutenir KidsLoveColor — une glace",
    description: "Une contribution facultative et ponctuelle pour nos coloriages gratuits. Il ne s’agit pas d’un achat de nourriture ou de boissons, ni d’un abonnement.",
  },
  es: {
    coffee: "Apoya a KidsLoveColor — un café",
    bubble: "Apoya a KidsLoveColor — un helado",
    description: "Una aportación voluntaria y única por nuestras páginas para colorear gratuitas. No es la compra de comida o bebidas ni una suscripción.",
  },
  zh: {
    coffee: "支持 KidsLoveColor — 一杯咖啡",
    bubble: "支持 KidsLoveColor — 一个冰淇淋",
    description: "自愿一次性支持我们的免费涂色页。这不是购买食品或饮品，也不是订阅。",
  },
});

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      ...headers,
    },
  });
}

export function supportOption(value) {
  return typeof value === "string" && Object.hasOwn(SUPPORT_OPTIONS, value)
    ? SUPPORT_OPTIONS[value] : null;
}

export function supportLanguage(value) {
  return typeof value === "string" && Object.hasOwn(SUPPORT_COPY, value) ? value : "nl";
}

export function homePath(lang) {
  return lang === "nl" ? "/" : `/${lang}`;
}

export function stripeSecret() {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(key)) return null;
  // Keep both directions isolated: production cannot pretend to charge, and
  // previews/local tests cannot accidentally create real payments.
  const expectedMode = process.env.VERCEL_ENV === "production" ? "live" : "test";
  if (!key.startsWith("sk_" + expectedMode + "_") && !key.startsWith("rk_" + expectedMode + "_")) return null;
  return key;
}

export function mollieSecret() {
  const key = (process.env.MOLLIE_API_KEY || "").trim();
  if (!/^(test|live)_[A-Za-z0-9]+$/.test(key)) return null;
  // Mollie is the fallback provider, including before Preview is configured.
  // A shared live environment variable must never allow real Preview payments.
  const expectedMode = process.env.VERCEL_ENV === "production" ? "live" : "test";
  return key.startsWith(expectedMode + "_") ? key : null;
}

// WeChat Pay is deliberately opt-in. Availability in Stripe's dashboard does
// not establish that this particular optional-support model is permitted.
// Keep Alipay out: its terms list donations as a prohibited category.
export function stripePaymentMethods() {
  const methods = ["card"];
  if (process.env.STRIPE_ENABLE_WECHAT_PAY === "true") methods.push("wechat_pay");
  return methods;
}

export function validCheckoutUrl(value, provider) {
  try {
    const url = new URL(value);
    const hosts = provider === "stripe" ? ["checkout.stripe.com"] : ["www.mollie.com", "checkout.mollie.com"];
    return url.protocol === "https:" && !url.username && !url.password && hosts.includes(url.hostname);
  } catch {
    return false;
  }
}

export function validSupportSession(session) {
  const option = supportOption(session?.metadata?.support);
  return !!option && session.object === "checkout.session" && session.mode === "payment"
    && session.metadata?.project === "kids-love-color"
    && session.currency === "eur" && session.amount_total === option.cents;
}

export function sessionStatus(session) {
  if (session.payment_status === "paid") return "paid";
  return session.status === "expired" ? "expired" : "pending";
}
