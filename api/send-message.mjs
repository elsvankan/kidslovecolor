const MAX_LENGTHS = Object.freeze({
  name: 100,
  email: 254,
  subject: 160,
  message: 4000,
  idea: 180,
  age: 80,
  difficulty: 80,
  details: 2000,
  source: 500,
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

function clean(value, field, required = false) {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw new Error(`missing:${field}`);
  if (text.length > MAX_LENGTHS[field]) throw new Error(`long:${field}`);
  return text;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= MAX_LENGTHS.email;
}

function buildRequest(payload) {
  const idea = clean(payload.idea, "idea", true);
  const age = clean(payload.age, "age", true);
  const difficulty = clean(payload.difficulty, "difficulty", true);
  const details = clean(payload.details, "details");
  const source = clean(payload.source, "source");
  const notify = payload.notify === true;
  const email = notify ? clean(payload.email, "email") : "";

  if (email && !isEmail(email)) throw new Error("invalid:email");
  if (notify && !email) throw new Error("missing:email");

  return {
    subject: `Kleurplaataanvraag: ${idea.replace(/[\r\n]+/g, " ")}`,
    replyTo: email || null,
    fields: {
      Type: "Kleurplaataanvraag",
      Idee: idea,
      Leeftijd: age,
      Moeilijkheid: difficulty,
      "Extra wensen": details || "—",
      "Op de hoogte houden": notify ? "Ja" : "Nee",
      Bronpagina: source || "—",
    },
  };
}

function buildContact(payload) {
  const name = clean(payload.name, "name", true);
  const email = clean(payload.email, "email", true);
  const subject = clean(payload.subject, "subject", true);
  const message = clean(payload.message, "message", true);
  const source = clean(payload.source, "source");

  if (!isEmail(email)) throw new Error("invalid:email");

  return {
    subject: `Contact via KidsLoveColor: ${subject.replace(/[\r\n]+/g, " ")}`,
    replyTo: email,
    fields: {
      Type: "Contactbericht",
      Naam: name,
      Onderwerp: subject,
      Bericht: message,
      Bronpagina: source || "—",
    },
  };
}

export default {
  async fetch(request) {
    if (request.method === "GET") {
      return json({
        available: Boolean(process.env.WEB3FORMS_ACCESS_KEY),
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Alleen POST-verzoeken zijn toegestaan." }, 405, { Allow: "POST" });
    }

    const requestUrl = new URL(request.url);
    const origin = request.headers.get("origin");
    if (origin !== requestUrl.origin) {
      return json({ error: "Ongeldige herkomst." }, 403);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Ongeldig verzoek." }, 400);
    }

    // Bots vullen dit verborgen veld vaak in. Doe alsof het bericht is verwerkt.
    if (typeof payload?.website === "string" && payload.website.trim()) {
      return json({ ok: true });
    }

    let email;
    try {
      if (payload?.type === "coloring-request") email = buildRequest(payload);
      else if (payload?.type === "contact") email = buildContact(payload);
      else return json({ error: "Onbekend formuliertype." }, 400);
    } catch (error) {
      return json({ error: "Controleer de ingevulde velden." }, 400);
    }

    const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      console.error("De Web3Forms-sleutel voor KidsLoveColor ontbreekt.");
      return json({ error: "Het formulier is tijdelijk niet beschikbaar." }, 503);
    }

    let formResponse;
    try {
      formResponse = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: email.subject,
          from_name: "KidsLoveColor website",
          ...(email.replyTo ? { email: email.replyTo } : {}),
          ...email.fields,
        }),
      });
    } catch (error) {
      console.error("Web3Forms is niet bereikbaar.", error);
      return json({ error: "Het bericht kon niet worden verzonden." }, 502);
    }

    const providerResult = await formResponse.json().catch(() => null);
    if (!formResponse.ok || providerResult?.success !== true) {
      console.error("Web3Forms heeft het bericht geweigerd.", {
        status: formResponse.status,
        response: providerResult,
      });
      return json({ error: "Het bericht kon niet worden verzonden." }, 502);
    }

    return json({ ok: true });
  },
};
