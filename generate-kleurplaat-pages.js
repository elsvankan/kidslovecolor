#!/usr/bin/env node
/**
 * generate-kleurplaat-pages.js
 *
 * Generates static HTML files for each coloring page at /kleurplaat/[slug]/index.html
 * These pages have proper og:image tags so Pinterest/social media can find the image.
 * Users get a quick redirect to the SPA.
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
  actualiteiten: 'Actualiteiten', kawaii: 'Kawaii',
};

let created = 0;

for (const page of COLORINGS) {
  const { slug, img, category } = page;
  if (requestedSlugs.size && !requestedSlugs.has(slug)) continue;
  const nl = page.nl || {};
  const title = nl.title || slug;
  const desc = nl.description || 'Gratis kleurplaat voor kinderen.';

  // Image URL: img is like '../img/kleurplaten/foo.jpg' → absolute URL
  const imgFile = img.replace('../img/kleurplaten/', '');
  const imgUrl = `${BASE_URL}/img/kleurplaten/${imgFile}`;
  const pageUrl = `${BASE_URL}/kleurplaat/${slug}`;
  const dir = path.join(outDir, slug);
  const outFile = path.join(dir, 'index.html');

  if (newOnly && fs.existsSync(outFile)) continue;

  const categoryName = categoryNames[category] || category;
  const breadcrumb = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: categoryName, item: `${BASE_URL}/?cat=${category}` },
      { '@type': 'ListItem', position: 3, name: title, item: pageUrl },
    ],
  });

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

  <!-- Breadcrumb structured data -->
  <script type="application/ld+json">${breadcrumb}</script>

  <!-- Redirect to SPA: store path so app.js can open the modal -->
  <meta http-equiv="refresh" content="0; url=/"/>
  <script>
    sessionStorage.setItem('spa_path', '/kleurplaat/${slug}');
    window.location.replace('/');
  </script>
</head>
<body>
  <p>Laden… <a href="/">Klik hier als je niet automatisch doorgestuurd wordt.</a></p>
</body>
</html>`;

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outFile, html, 'utf8');
  created++;
}

console.log(`✅ Generated ${created} kleurplaat pages in /kleurplaat/`);
console.log(`\nNu pushen:`);
console.log(`  git add kleurplaat/ && git commit -m "Generate kleurplaat static pages for Pinterest" && git push`);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
