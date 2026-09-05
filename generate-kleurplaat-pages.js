#!/usr/bin/env node
/**
 * generate-kleurplaat-pages.js
 *
 * Generates static HTML files for each coloring page at /kleurplaat/[slug]/index.html
 * These pages are fully indexable detail pages with proper image metadata for
 * search engines, Pinterest and other social platforms.
 *
 * Run: node generate-kleurplaat-pages.js
 * Then: git add kleurplaat/ && git commit -m "Regenerate kleurplaat pages" && git push
 */

const fs = require('fs');
const path = require('path');

// Load data.js by extracting the arrays
const dataRaw = fs.readFileSync(path.join(__dirname, 'js/data.js'), 'utf8');

// Extract COLORINGS array
const coloringsMatch = dataRaw.match(/const COLORINGS\s*=\s*(\[[\s\S]*?\n\];)/);
if (!coloringsMatch) { console.error('COLORINGS not found'); process.exit(1); }
const COLORINGS = eval(coloringsMatch[1]);

const BASE_URL = 'https://kidslovecolor.com';
const outDir = path.join(__dirname, 'kleurplaat');
const newOnly = process.argv.includes('--new-only');
const requestedSlugs = new Set(
  process.argv.filter((arg) => arg.startsWith('--slug=')).map((arg) => arg.slice(7))
);
const categoryNames = {
  dieren: 'Dieren', voertuigen: 'Voertuigen', sprookjes: 'Sprookjes',
  ruimte: 'Ruimte', oceaan: 'Oceaan', natuur: 'Natuur', eten: 'Eten',
  beroepen: 'Beroepen', seizoenen: 'Seizoenen', mandala: 'Mandala',
  actualiteiten: 'Actualiteiten', kawaii: 'Kawaii', prinsessen: 'Prinsessen',
  feestdagen: 'Feestdagen', letters: 'Letters', gezichten: 'Gezichten',
};
const difficultyNames = { easy: 'Makkelijk', medium: 'Gemiddeld', hard: 'Uitdagend' };

let created = 0;

for (const page of COLORINGS) {
  const { slug, img, category } = page;
  if (requestedSlugs.size && !requestedSlugs.has(slug)) continue;
  const nl = page.nl || {};
  const title = nl.title || slug;
  const desc = nl.description || 'Gratis kleurplaat voor kinderen.';

  // Image URL: img is like '../img/kleurplaten/foo.jpg' → absolute URL
  const imgFile = img.replace('../img/kleurplaten/', '');
  const imgPath = `/img/kleurplaten/${imgFile}`;
  const imgUrl = `${BASE_URL}/img/kleurplaten/${imgFile}`;
  const pageUrl = `${BASE_URL}/kleurplaat/${slug}`;
  const dir = path.join(outDir, slug);
  const outFile = path.join(dir, 'index.html');

  if (newOnly && fs.existsSync(outFile)) continue;

  const categoryName = categoryNames[category] || category;
  const difficultyName = difficultyNames[page.difficulty] || page.difficulty;
  const breadcrumb = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: categoryName, item: `${BASE_URL}/?cat=${category}` },
      { '@type': 'ListItem', position: 3, name: title, item: pageUrl },
    ],
  });
  const imageSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    '@id': `${pageUrl}#image`,
    name: `${title} – Gratis Kleurplaat`,
    description: desc,
    contentUrl: imgUrl,
    thumbnailUrl: `${BASE_URL}/img/kleurplaten/thumbs/${imgFile}`,
    encodingFormat: 'image/jpeg',
    width: 1055,
    height: 1491,
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    acquireLicensePage: `${BASE_URL}/#over-ons`,
    creditText: 'KidsLoveColor',
    creator: { '@type': 'Organization', name: 'KidsLoveColor', url: BASE_URL },
  });
  const newsHtml = nl.newsExplainer ? `
    <section class="news-context" aria-labelledby="news-context-title">
      <h2 id="news-context-title">Het verhaal achter deze kleurplaat</h2>
      <p>${escapeHtml(nl.newsExplainer)}</p>
      ${nl.newsArticle ? `<p>${escapeHtml(nl.newsArticle)}</p>` : ''}
      ${Array.isArray(nl.newsFacts) ? `<h3>Drie weetjes</h3><ul>${nl.newsFacts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul>` : ''}
      ${nl.newsQuestion ? `<p><strong>Praatvraag:</strong> ${escapeHtml(nl.newsQuestion)}</p>` : ''}
    </section>` : '';

  const html = `<!DOCTYPE html>
<html lang="nl" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(title)} – Gratis Kleurplaat | KidsLoveColor.com</title>
  <meta name="description" content="${escapeHtml(desc)}"/>
  <link rel="canonical" href="${pageUrl}"/>

  <!-- Open Graph / Pinterest -->
  <meta property="og:type"        content="article"/>
  <meta property="og:url"         content="${pageUrl}"/>
  <meta property="og:title"       content="${escapeHtml(title)} – Gratis Kleurplaat"/>
  <meta property="og:description" content="${escapeHtml(desc)}"/>
  <meta property="og:image"       content="${imgUrl}"/>
  <meta property="og:image:width" content="1055"/>
  <meta property="og:image:height" content="1491"/>
  <meta property="og:site_name"   content="KidsLoveColor"/>
  <meta property="og:locale"      content="nl_NL"/>

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="${escapeHtml(title)} – Gratis Kleurplaat"/>
  <meta name="twitter:description" content="${escapeHtml(desc)}"/>
  <meta name="twitter:image"       content="${imgUrl}"/>

  <!-- Structured data -->
  <script type="application/ld+json">${breadcrumb}</script>
  <script type="application/ld+json">${imageSchema}</script>
  <style>
    :root { --ink:#342d38; --muted:#746a77; --paper:#fbf8f6; --rose:#c96d91; --raspberry:#a94f73; --blush:#f3dbe4; --lavender:#e8e0f2; --line:#ded4dc; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); background:var(--paper); font-family:"Avenir Next","Trebuchet MS",Arial,sans-serif; line-height:1.55; }
    a { color:var(--raspberry); }
    .site-header { background:#fff; border-bottom:1px solid var(--line); }
    .header-inner { width:min(1120px,calc(100% - 32px)); margin:auto; min-height:78px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
    .brand img { display:block; width:94px; height:auto; }
    .back-link { font-weight:700; text-decoration:none; }
    main { width:min(1120px,calc(100% - 32px)); margin:26px auto 56px; }
    .breadcrumbs { color:var(--muted); font-size:.92rem; margin-bottom:18px; }
    .breadcrumbs a { color:inherit; }
    .page-grid { display:grid; grid-template-columns:minmax(0,1.05fr) minmax(290px,.75fr); gap:clamp(28px,5vw,64px); align-items:start; }
    .coloring-card { background:#fff; border:1px solid var(--line); border-radius:22px; padding:18px; box-shadow:0 16px 44px rgba(52,45,56,.08); }
    .coloring-card img { display:block; width:100%; height:auto; border-radius:12px; }
    .eyebrow { color:var(--raspberry); font-weight:800; letter-spacing:.08em; text-transform:uppercase; font-size:.76rem; }
    h1,h2,h3 { font-family:Georgia,"Times New Roman",serif; line-height:1.12; }
    h1 { margin:.45rem 0 1rem; font-size:clamp(2rem,5vw,3.55rem); font-weight:500; overflow-wrap:anywhere; hyphens:auto; }
    h2 { margin-top:2rem; font-size:1.45rem; }
    .lead { color:var(--muted); font-size:1.08rem; }
    .badges { display:flex; flex-wrap:wrap; gap:8px; margin:18px 0; }
    .badge { background:var(--lavender); border-radius:999px; padding:7px 12px; font-size:.86rem; font-weight:700; }
    .actions { display:grid; gap:10px; margin:24px 0; }
    .button { display:flex; align-items:center; justify-content:center; min-height:48px; border:0; border-radius:999px; padding:12px 18px; font:inherit; font-weight:800; text-decoration:none; cursor:pointer; }
    .button-primary { color:#fff; background:var(--raspberry); }
    .button-secondary { color:var(--ink); background:var(--blush); }
    .trust-note,.news-context { margin-top:24px; border-left:4px solid var(--rose); background:#fff; border-radius:0 16px 16px 0; padding:18px 20px; }
    .trust-note p,.news-context p:last-child { margin-bottom:0; }
    .news-context { grid-column:1/-1; }
    footer { border-top:1px solid var(--line); padding:24px 16px; text-align:center; color:var(--muted); background:#fff; }
    @media (max-width:760px) { .page-grid { grid-template-columns:1fr; } .page-copy { order:-1; } .header-inner { min-height:68px; } }
    @media print {
      @page { size:A4 portrait; margin:8mm; }
      body { background:#fff; }
      .site-header,.breadcrumbs,.page-copy,.news-context,footer { display:none !important; }
      main { width:auto; margin:0; }
      .page-grid { display:block; }
      .coloring-card { border:0; box-shadow:none; padding:0; }
      .coloring-card img { width:100%; max-height:281mm; object-fit:contain; border-radius:0; }
    }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="KidsLoveColor home"><img src="/img/logo.svg" alt="KidsLoveColor"/></a>
      <a class="back-link" href="/?cat=${category}">Bekijk meer ${categoryName.toLowerCase()} kleurplaten</a>
    </div>
  </header>
  <main>
    <nav class="breadcrumbs" aria-label="Broodkruimel">
      <a href="/">Home</a> · <a href="/?cat=${category}">${categoryName}</a> · ${escapeHtml(title)}
    </nav>
    <article class="page-grid">
      <figure class="coloring-card">
        <img src="${imgPath}" width="1055" height="1491" alt="${escapeHtml(nl.altText || title)}" fetchpriority="high"/>
      </figure>
      <div class="page-copy">
        <span class="eyebrow">Gratis printbare kleurplaat</span>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(desc)}</p>
        <div class="badges"><span class="badge">${categoryName}</span><span class="badge">${difficultyName}</span><span class="badge">A4 · 1055 × 1491 px</span></div>
        <div class="actions">
          <button class="button button-primary" type="button" onclick="window.print()">Print deze kleurplaat</button>
          <a class="button button-secondary" href="${imgPath}" download>Download als JPG</a>
          <a class="button button-secondary" href="/?kleurplaat=${slug}">Open in de kleurplatengalerij</a>
        </div>
        <aside class="trust-note">
          <strong>Zelf kiezen en meteen printen</strong>
          <p>KidsLoveColor is intuïtief en reclamevrij. Kinderen kunnen zelf een kleurplaat uitzoeken en veilig printen.</p>
        </aside>
      </div>
      ${newsHtml}
    </article>
  </main>
  <footer>© KidsLoveColor · Gratis kleurplaten voor thuis en op school</footer>
</body>
</html>`;

  fs.mkdirSync(dir, { recursive: true });
  const cleanHtml = `${html.replace(/[ \t]+$/gm, '').trimEnd()}\n`;
  fs.writeFileSync(outFile, cleanHtml, 'utf8');
  created++;
}

syncVercelRewrites();

console.log(`✅ Generated ${created} kleurplaat pages in /kleurplaat/`);
console.log(`\nNu pushen:`);
console.log(`  git add kleurplaat/ && git commit -m "Generate kleurplaat static pages for Pinterest" && git push`);

function syncVercelRewrites() {
  const vercelPath = path.join(__dirname, 'vercel.json');
  const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const unrelated = (config.rewrites || []).filter((rule) => !rule.source.startsWith('/kleurplaat/'));
  const coloringRules = COLORINGS.map(({ slug }) => ({
    source: `/kleurplaat/${slug}`,
    destination: `/kleurplaat/${slug}/index.html`,
  }));
  config.rewrites = [
    ...unrelated,
    ...coloringRules,
    { source: '/kleurplaat/(.*)', destination: '/index.html' },
  ];
  fs.writeFileSync(vercelPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
