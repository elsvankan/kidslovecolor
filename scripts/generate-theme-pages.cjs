'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { THEMES } = require('../lib/theme-pages.cjs');
const baseUrl = 'https://www.kidslovecolor.com';
const languageLabels = { nl: 'NL', en: 'EN', fr: 'FR', es: 'ES', zh: '中文' };

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function renderTheme(key, theme, language, colorings) {
  const copy = theme.copy[language];
  const home = language === 'nl' ? '/' : `/${language}/`;
  const url = baseUrl + theme.paths[language];
  const pages = colorings.filter(item => !item.hidden && item.category !== 'actualiteiten' && item.collections?.includes(key));
  if (!pages.length) throw new Error(`Theme ${key} has no published coloring records`);
  const heroImage = pages[0].img.replace(/^\.\.\//, '/');
  const alternates = Object.entries(theme.paths).map(([code, route]) => `<link rel="alternate" hreflang="${code === 'zh' ? 'zh-Hans' : code}" href="${baseUrl}${route}"/>`).join('\n');
  const languages = Object.entries(theme.paths).map(([code, route]) => `<a href="${route}" hreflang="${code}"${code === language ? ' aria-current="page"' : ''}>${languageLabels[code]}</a>`).join('');
  const cards = pages.map(item => {
    const title = (item[language] || item.nl).title;
    const image = item.img.replace(/^\.\.\//, '/');
    const thumbnail = image.replace('/img/kleurplaten/', '/img/kleurplaten/thumbs/');
    const fact = item.learningFact?.[language];
    return `<article class="theme-card">
      <a class="theme-picture" href="/kleurplaat/${escapeHtml(item.slug)}"><img src="${escapeHtml(thumbnail)}" alt="${escapeHtml((item[language] || item.nl).altText)}" width="400" height="566" loading="lazy"/></a>
      <div class="theme-card-copy"><h3>${escapeHtml(title)}</h3>
        ${item.scientificName ? `<p class="species-name"><i>${escapeHtml(item.scientificName)}</i></p>` : ''}
        ${fact ? `<p class="theme-fact">${escapeHtml(fact)} <a href="${escapeHtml(item.referenceUrl)}" rel="external">${escapeHtml(copy.source)}</a></p>` : ''}
        <a class="theme-button" href="/kleurplaat/${escapeHtml(item.slug)}">${escapeHtml(copy.open)}</a>
        <a class="theme-download" href="${escapeHtml(image)}" download="${escapeHtml(path.basename(image))}">${escapeHtml(copy.download)}</a>
      </div></article>`;
  }).join('\n');
  const schema = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', '@id': url, url, name: copy.title, description: copy.description, inLanguage: language, mainEntity: { '@id': url + '#colorings' } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'KidsLoveColor', item: baseUrl + home }, { '@type': 'ListItem', position: 2, name: copy.label, item: url }] },
      { '@type': 'ItemList', '@id': url + '#colorings', numberOfItems: pages.length, itemListElement: pages.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: (item[language] || item.nl).title, url: baseUrl + '/kleurplaat/' + item.slug })) }
    ]
  };
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(copy.title)} | KidsLoveColor</title>
  <meta name="description" content="${escapeHtml(copy.description)}"/>
  <meta name="robots" content="index, follow, max-image-preview:large"/>
  <link rel="canonical" href="${url}"/>
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${baseUrl}${theme.paths.nl}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="${url}"/>
  <meta property="og:title" content="${escapeHtml(copy.title)}"/>
  <meta property="og:description" content="${escapeHtml(copy.description)}"/>
  <meta property="og:image" content="${baseUrl}${heroImage}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <link rel="icon" href="/img/logo.svg" type="image/svg+xml"/>
  <link rel="stylesheet" href="/css/theme-pages.css"/>
  <script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>
</head>
<body>
  <a class="skip-link" href="#main">${escapeHtml(copy.choose)}</a>
  <header class="theme-header"><a href="${home}" aria-label="KidsLoveColor"><img src="/img/logo.svg" alt="KidsLoveColor" width="94" height="87"/></a><nav aria-label="${escapeHtml(copy.languages)}">${languages}</nav></header>
  <main id="main">
    <nav class="theme-breadcrumbs" aria-label="Breadcrumb"><a href="${home}">KidsLoveColor</a><span aria-hidden="true"> / </span>${escapeHtml(copy.label)}</nav>
    <section class="theme-hero" aria-labelledby="theme-heading">
      <div><p class="theme-eyebrow">${escapeHtml(copy.eyebrow)}</p><h1 id="theme-heading">${escapeHtml(copy.heading)}</h1><p class="theme-hero-line">${escapeHtml(copy.hero)}</p><p>${escapeHtml(copy.intro)}</p><div class="theme-actions"><a class="theme-button" href="#colorings">${escapeHtml(copy.choose)}</a><a href="${home}">${escapeHtml(copy.all)} →</a></div><ul class="theme-promises">${copy.promise.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul></div>
      <figure class="theme-hero-paper"><img src="${escapeHtml(heroImage)}" alt="${escapeHtml((pages[0][language] || pages[0].nl).altText)}" width="1055" height="1491" fetchpriority="high"/></figure>
    </section>
    <section id="colorings" aria-labelledby="gallery-heading"><p class="theme-eyebrow">${pages.length} · ${escapeHtml(copy.label)}</p><h2 id="gallery-heading">${escapeHtml(copy.gallery)}</h2><div class="theme-grid">${cards}</div></section>
    <div class="theme-guides"><section><h2>${escapeHtml(copy.guide)}</h2><ol>${copy.steps.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ol></section><section><h2>${escapeHtml(copy.learn)}</h2><p>${escapeHtml(copy.learnText)}</p></section></div>
    <section class="theme-faq" aria-labelledby="faq-heading"><h2 id="faq-heading">${escapeHtml(copy.questions)}</h2>${copy.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('')}</section>
    <nav class="theme-related" aria-label="${escapeHtml(copy.related)}"><h2>${escapeHtml(copy.related)}</h2><a href="${home}?cat=dieren">${escapeHtml(copy.animals)}</a><a href="${home}?cat=natuur">${escapeHtml(copy.nature)}</a><a href="${home}?cat=ruimte">${escapeHtml(copy.space)}</a><a href="/vandaag-op-aarde/">${escapeHtml(copy.story)}</a></nav>
  </main>
  <footer class="theme-footer"><p>${escapeHtml(copy.footer)}</p><a href="${home}">${escapeHtml(copy.all)}</a></footer>
</body>
</html>
`;
}

function writeThemePages(root) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8') + '\nthis.colorings = COLORINGS;', context);
  const paths = [];
  for (const [key, theme] of Object.entries(THEMES)) {
    for (const [language, route] of Object.entries(theme.paths)) {
      const relative = route.slice(1) + '/index.html';
      fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
      fs.writeFileSync(path.join(root, relative), renderTheme(key, theme, language, context.colorings));
      paths.push(relative);
    }
  }
  return paths;
}

if (require.main === module) console.log('Generated theme pages:', writeThemePages(path.resolve(__dirname, '..')).length);
module.exports = { renderTheme, writeThemePages, THEMES };
