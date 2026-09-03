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

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function row(label, value) {
  return `<tr><th align="left" valign="top" style="padding:6px 14px 6px 0">${escapeHtml(label)}</th><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(value || "—")}</td></tr>`;
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
    subject: `Kleurplaataanvraag: ${idea}`,
    replyTo: email || null,
    html: [
      "<h1>Nieuwe kleurplaataanvraag</h1>",
      "<table>",
      row("Idee", idea),
      row("Leeftijd", age),
      row("Moeilijkheid", difficulty),
      row("Extra wensen", details),
      row("Op de hoogte houden", notify ? "Ja" : "Nee"),
      row("E-mailadres ouder/leerkracht", email),
      row("Bronpagina", source),
      "</table>",
    ].join(""),
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
    subject: `Contact via KidsLoveColor: ${subject}`,
    replyTo: email,
    html: [
      "<h1>Nieuw contactbericht</h1>",
      "<table>",
      row("Naam", name),
      row("E-mailadres", email),
      row("Onderwerp", subject),
      row("Bericht", message),
      row("Bronpagina", source),
      "</table>",
    ].join(""),
  };
}

export default {
  async fetch(request) {
    if (request.method === "GET") {
      return json({
        available: Boolean(
          process.env.RESEND_API_KEY &&
          process.env.KLC_CONTACT_RECIPIENT &&
          process.env.KLC_CONTACT_FROM
        ),
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Alleen POST-verzoeken zijn toegestaan." }, 405, { Allow: "POST" });
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

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.KLC_CONTACT_RECIPIENT;
    const sender = process.env.KLC_CONTACT_FROM;
    if (!apiKey || !recipient || !sender) {
      console.error("De mailinstellingen voor KidsLoveColor ontbreken.");
      return json({ error: "Het formulier is tijdelijk niet beschikbaar." }, 503);
    }

    let mailResponse;
    try {
      mailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: sender,
          to: [recipient],
          subject: email.subject,
          html: email.html,
          ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        }),
      });
    } catch (error) {
      console.error("De maildienst is niet bereikbaar.", error);
      return json({ error: "Het bericht kon niet worden verzonden." }, 502);
    }

    if (!mailResponse.ok) {
      const providerError = await mailResponse.text();
      console.error(`De maildienst gaf status ${mailResponse.status}: ${providerError}`);
      return json({ error: "Het bericht kon niet worden verzonden." }, 502);
    }

    return json({ ok: true });
  },
};
