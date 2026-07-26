const SUPPORT_OPTIONS = Object.freeze({
  coffee: {
    value: "3.00",
    description: "Kop koffie voor Kids Love Color",
  },
  bubble: {
    value: "5.00",
    description: "Bubble tea voor Kids Love Color",
  },
});

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json(
        { error: "Alleen POST-verzoeken zijn toegestaan." },
        405,
        { Allow: "POST" },
      );
    }

    const requestUrl = new URL(request.url);
    const origin = request.headers.get("origin");

    if (origin && origin !== requestUrl.origin) {
      return json({ error: "Ongeldige herkomst." }, 403);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Ongeldig verzoek." }, 400);
    }

    const option = SUPPORT_OPTIONS[payload?.support];
    if (!option) {
      return json({ error: "Kies koffie of bubble tea." }, 400);
    }

    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      console.error("MOLLIE_API_KEY is niet ingesteld.");
      return json(
        { error: "Betalen is tijdelijk niet beschikbaar. Probeer het later opnieuw." },
        503,
      );
    }

    const returnBase = requestUrl.origin;
    const paymentRequest = {
      amount: {
        currency: "EUR",
        value: option.value,
      },
      description: option.description,
      redirectUrl: `${returnBase}/?donation=thanks&support=${encodeURIComponent(
        payload.support,
      )}#steun-ons`,
      cancelUrl: `${returnBase}/?donation=cancelled#steun-ons`,
      webhookUrl: `${returnBase}/api/mollie-webhook`,
      metadata: {
        project: "kids-love-color",
        support: payload.support,
      },
    };

    let mollieResponse;
    try {
      mollieResponse = await fetch("https://api.mollie.com/v2/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentRequest),
      });
    } catch (error) {
      console.error("Mollie is niet bereikbaar.", error);
      return json(
        { error: "Betalen is tijdelijk niet beschikbaar. Probeer het later opnieuw." },
        502,
      );
    }

    if (!mollieResponse.ok) {
      const mollieError = await mollieResponse.text();
      console.error(`Mollie gaf status ${mollieResponse.status}: ${mollieError}`);
      return json(
        { error: "De betaling kon niet worden gestart. Probeer het later opnieuw." },
        502,
      );
    }

    const payment = await mollieResponse.json();
    const checkoutUrl = payment?._links?.checkout?.href;

    if (!checkoutUrl) {
      console.error("Mollie-respons bevat geen checkout-URL.");
      return json(
        { error: "De betaling kon niet worden gestart. Probeer het later opnieuw." },
        502,
      );
    }

    return json({ checkoutUrl });
  },
};

