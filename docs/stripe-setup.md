# Stripe voorbereiden en activeren voor KidsLoveColor

## Wat staat klaar?

- Dezelfde bedragen: €3 voor koffie, €5 voor een ijsje.
- Een eenmalige, vrijwillige bijdrage voor de bestaande gratis kleurplaten.
  Er wordt geen echt eten of drinken verkocht en er ontstaat geen abonnement.
- Stripe Checkout in Nederlands, Engels, Frans, Spaans of Chinees.
- Een aparte terugkeerpagina zonder Analytics of externe scripts.
- Controle bij Stripe voordat de site zegt dat een betaling ontvangen is.
- Ondertekende webhookcontrole; ongeldige of te oude berichten worden geweigerd.
- Geen kaartnummers, namen of e-mailadressen in de websitecode of logs.
- Mollie blijft standaard actief. De Stripe-voorbereiding schakelt niets vanzelf om.

## Nog door de accounteigenaar te doen

1. Rond de activatie in het Stripe-dashboard af. Controleer officiële bedrijfsnaam,
   KvK, btw-nummer, vertegenwoordiger, bedrijfsomschrijving en bankrekening.
   Gebruik echte gegevens en de werkelijke activiteit: gratis kleurplaten met
   vrijwillige bijdragen van bezoekers. Geen fictieve verkoop van eten of drinken of goed doel.
2. Controleer de zichtbare bedrijfsnaam, contactgegevens en omschrijving op het
   bankafschrift. Kies herkenbare gegevens voor KidsLoveColor binnen je bedrijf.
3. Beschrijf de bijdrage eerlijk als een optionele fooi voor de kleurplaten die
   al gratis beschikbaar zijn, niet als een liefdadigheidsdonatie. Stripe staat
   fooien voor geleverde inhoud/diensten toe. Makers die eigen inhoud op hun eigen
   website aanbieden hebben volgens de algemene regels geen voorafgaande
   goedkeuring als contentplatform nodig; dit is geen garantie voor dit account
   of voor iedere betaalmethode. Bij twijfel: leg het volledige model aan Stripe voor.
   Een actief account voor betalingen en uitbetalingen is iets anders dan
   geschiktheid voor een specifieke betaalmethode.
4. Zet eerst een sandboxproef op een afgeschermde Vercel Preview klaar. Doe geen
   testbetalingen via productie.

## Geheimen veilig instellen in Vercel

Project: de bestaande productieomgeving van kidslovecolor.com.

Onder Settings → Environment Variables:

| Naam | Preview | Production |
| --- | --- | --- |
| SUPPORT_PAYMENT_PROVIDER | stripe, alleen voor de gecontroleerde proef | mollie totdat de proef klaar is |
| STRIPE_SECRET_KEY | beperkte sandbox-sleutel, rk_test_ | beperkte live-sleutel, rk_live_, pas na activering |
| STRIPE_WEBHOOK_SECRET | signing secret van sandbox-webhook | signing secret van live-webhook |
| MOLLIE_API_KEY | alleen een testsleutel (test_), of niet instellen | bestaande live-sleutel (live_) behouden |

Sleutels nooit in chat, GitHub, HTML of een screenshot delen.
Maak bij voorkeur een aparte beperkte API-sleutel (Restricted API Key) voor deze
koppeling. Begin in de sandbox met **Checkout Sessions: Write** en alle overige
rechten op **None**. Write omvat ook Read. Test de volledige koppeling en voeg
alleen een extra recht toe als een aantoonbare sandboxfout aangeeft dat de code
dat recht nodig heeft. Neem uitsluitend die geteste rechten over voor de
live-sleutel. Geef geen rechten voor uitbetalingen of terugbetalingen.
Een webhook ontvangen en de handtekening controleren vereist alleen de aparte
signing secret; daarvoor hoeft de API-sleutel geen webhook-endpoints te kunnen
aanmaken of wijzigen.
Er is voor deze hosted Checkout geen publishable key in de browser nodig.

Maak na een instellingwijziging een nieuwe deployment. De code accepteert
live Stripe- en Mollie-sleutels uitsluitend bij VERCEL_ENV=production. Preview
en lokaal werken alleen met testsleutels; productie weigert juist testsleutels.
De standaardprovider is Mollie: ook voordat Stripe voor een Preview is ingesteld,
weigert die Preview een eventueel gedeelde live Mollie-sleutel. Zet live
sleutels uitsluitend op Production. Gebruik voor iedere omgeving de bijpassende
webhook en signing secret.

## Webhook in Stripe

Voeg voor het liveaccount deze endpoint toe:
https://www.kidslovecolor.com/api/stripe-webhook

Selecteer:
- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed

Gebruik voor de sandbox de URL van de Preview-deployment. De bijbehorende signing
secret begint met whsec_ en gaat uitsluitend in STRIPE_WEBHOOK_SECRET.

De webhook controleert handtekening, ouderdom, project, bedrag en valuta. Hij
geeft geen kleurplaten vrij, stuurt geen e-mails en verricht geen andere eenmalige
actie. Een dubbele webhook is daarom veilig. Stripe zelf is het betaaloverzicht;
de website bewaart geen eigen administratie van betalers.

## Betaalmethoden: kaarten, Alipay en WeChat Pay

De koppeling start expliciet met kaarten. Apple Pay en Google Pay verschijnen
alleen wanneer Stripe, account, apparaat en kaart daarvoor in aanmerking komen.
Er worden geen extra toeslagen boven €3 of €5 gerekend.

Alipay en WeChat Pay blijven beide uit totdat Stripe de geschiktheid van dit
specifieke account en deze werkelijke activiteit heeft verduidelijkt.

- Alipay noemt donaties en crowdfunding als verboden categorieën.
- WeChat Pay ondersteunt technisch Nederlandse accounts, EUR en eenmalige
  hosted Checkout-betalingen. De grensoverschrijdende regels van Tencent
  verbieden echter onder meer liefdadigheids-/sociale diensten en crowdfunding.
  Optionele fooien voor gratis kleurplaten worden niet expliciet toegestaan in
  de geraadpleegde regels. Een beschikbare schakelaar is geen bevestiging van
  geschiktheid voor dit gebruik.

Leg daarom eerst deze vraag aan Stripe voor: mag een Nederlands bedrijf via deze
betaalmethode optionele fooien van €3 of €5 ontvangen voor kleurplaten die al
gratis op de eigen website beschikbaar zijn, zonder goed doel, abonnement of
fysiek product? Activeer alleen als de bevestiging ook dit model en dit account
dekt. Een andere naam geven aan dezelfde bijdrage, zoals koffie of een ijsje,
verandert de aard van de betaling niet.

De bedragen blijven €3 en €5. Beide liggen boven Stripe's algemene EUR-minimum
van €0,50; een betaalmethode kan aanvullende eigen voorwaarden hebben.

## Testen vóór omschakelen

Lokale controles (Node 22+):
    node --test tests/support-payments.test.mjs
    node --check api/create-payment.mjs
    node --check api/payment-status.mjs
    node --check api/stripe-webhook.mjs
    node --check js/support-payments.js

Daarna in de Stripe-sandbox:
1. Open beide knoppen: exact €3 en €5, EUR en eenmalig.
2. Controleer alle vijf talen en terugkeer naar de juiste taal.
3. Gebruik de officiële Stripe-testkaart, nooit een echte kaart in de sandbox.
4. Test geslaagd, geannuleerd, geweigerd en extra authenticatie.
5. Controleer het betaaloverzicht én een geslaagde webhooklevering.
6. Een bezoek aan /support-return zonder echte sessie mag nooit succes melden.
7. Controleer op telefoon en desktop; een mislukte verbinding moet de knoppen
   opnieuw beschikbaar maken, zonder een betaling als geslaagd te markeren.

De geautomatiseerde tests gebruiken nagebootste providerantwoorden. Ze vervangen
deze volledige sandboxproef niet.

## Publiceren en terugschakelen

Pas na succesvolle proef en accountactivatie:
- Zet live Stripe-geheimen in Production.
- Zet SUPPORT_PAYMENT_PROVIDER=stripe.
- Deploy opnieuw en controleer beide checkout-bedragen zonder onbedoeld te betalen.
- Een echte betalingstest alleen met expliciete toestemming van de eigenaar.
- Controleer de eerste echte betaling in Stripe én de terugkeerpagina.

Bij problemen: SUPPORT_PAYMENT_PROVIDER=mollie, opnieuw deployen. De bestaande
Mollie-sleutel en webhook blijven intact. Er wordt bij een Stripe-fout niet
automatisch óók een Mollie-betaling gestart: dat voorkomt verwarring/dubbelen.

## Bronnen (gecontroleerd 18 september 2026)

- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/keys/restricted-api-keys
- https://docs.stripe.com/webhooks/signature
- https://docs.stripe.com/testing
- https://support.stripe.com/questions/requirements-for-accepting-tips-or-donations
- https://stripe.com/legal/restricted-businesses
- https://docs.stripe.com/payments/wechat-pay
- https://pay.weixin.qq.com/index.php/public/wechatpay_en/proper_rule
- https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts
- https://stripe.com/legal/alipay
