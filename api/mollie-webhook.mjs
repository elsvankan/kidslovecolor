const PAYMENT_ID_PATTERN = /^tr_[A-Za-z0-9]+$/;

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "POST" },
      });
    }

    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      console.error("MOLLIE_API_KEY is niet ingesteld.");
      return new Response("Service Unavailable", { status: 503 });
    }

    let paymentId = "";
    try {
      const body = await request.text();
      paymentId = new URLSearchParams(body).get("id") ?? "";
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    if (!PAYMENT_ID_PATTERN.test(paymentId)) {
      return new Response("Bad Request", { status: 400 });
    }

    let mollieResponse;
    try {
      mollieResponse = await fetch(
        `https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );
    } catch (error) {
      console.error("Mollie-status kon niet worden opgehaald.", error);
      return new Response("Bad Gateway", { status: 502 });
    }

    if (!mollieResponse.ok) {
      console.error(
        `Mollie-statuscontrole gaf status ${mollieResponse.status} voor ${paymentId}.`,
      );
      return new Response("Bad Gateway", { status: 502 });
    }

    const payment = await mollieResponse.json();
    console.info(`Mollie-betaling ${paymentId}: ${payment.status ?? "onbekend"}`);

    return new Response("OK", {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  },
};

