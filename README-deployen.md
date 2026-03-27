# KidsLoveColor.com — Deployment Guide

## 🚀 Deployen via Vercel (aanbevolen)

1. Ga naar [vercel.com](https://vercel.com) en maak een gratis account
2. Klik op **"Add New Project"**
3. Kies **"Upload"** (of koppel een GitHub repo als je dat wilt)
4. Upload de hele `kidslovecolor/` map
5. Klik op **Deploy** — klaar!
6. Stel je domeinnaam `kidslovecolor.com` in via **Settings → Domains**

## 📁 Bestanden uploaden (alternatief: FTP/cPanel)

Upload alle bestanden naar de `public_html/` map van je hosting:
- `index.html`
- `en/index.html`
- `css/style.css`
- `js/data.js`
- `js/app.js`
- `svg/` (voorbeeldafbeeldingen — vervang met jouw eigen kleurplaten)
- `favicon.svg`
- `vercel.json` (alleen voor Vercel)

## 🖼️ Jouw eigen kleurplaten toevoegen

1. Maak een map `img/` aan in de root van de site
2. Zet je afbeeldingen daarin (SVG of PNG, minstens 800×800 px)
3. Open `js/data.js` en voeg een entry toe:

```js
{
  id: 17,
  slug: 'mijn-kleurplaat',
  category: 'dieren',       // zie CATEGORIES in data.js
  difficulty: 'easy',        // easy | medium | hard
  img: 'img/mijn-kleurplaat.svg',
  nl: { title: 'Mijn Kleurplaat', keywords: 'zoektermen hier' },
  en: { title: 'My Coloring Page', keywords: 'search terms here' },
},
```

## 💰 Google AdSense activeren

1. Maak een account op [adsense.google.com](https://adsense.google.com)
2. Voeg de site `kidslovecolor.com` toe en wacht op goedkeuring
3. Zodra goedgekeurd: zoek in `index.html` en `en/index.html` naar:
   ```
   <!-- Verwijder onderstaande div en vervang door Google Ads code -->
   ```
4. Verwijder de placeholder `<div class="ad-banner">` en verwijder de `<!--` en `-->` rond de `<ins>` tags
5. Vervang `ca-pub-XXXXXXXX` met jouw Publisher ID
6. Vervang `data-ad-slot="..."` met jouw ad slot nummers

**Ad plaatsen in de site:**
- **Header leaderboard** (728×90): bovenaan de pagina
- **Sidebar** (300×250): 2× in de zijbalk
- **Tussen content** (970×90): midden op de pagina
- **In modal** (728×90): wanneer je een kleurplaat opent

## 🌍 Tweetalig

- Nederlands: `kidslovecolor.com/` → `index.html`
- Engels: `kidslovecolor.com/en/` → `en/index.html`

Zowel de NL als EN versie lezen dezelfde data uit `js/data.js`.
Elke kleurplaat heeft een `nl` en `en` object met titel en zoektermen.

## 📊 SEO Tips

- Voeg meer kleurplaten toe regelmatig (vers content = betere ranking)
- Geef afbeeldingen duidelijke bestandsnamen: `vlinder-kleurplaat.svg`
- Gebruik beschrijvende alt-teksten in data.js
- Registreer de site bij Google Search Console

## 📞 Vragen?

De website is gebouwd als volledig statische site — geen database, geen server nodig.
Alles werkt puur via HTML, CSS en JavaScript.
