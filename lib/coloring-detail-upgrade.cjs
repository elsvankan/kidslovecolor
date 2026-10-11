const BASE_URL = 'https://www.kidslovecolor.com';
const { renderDetail } = require('../generate-kleurplaat-pages.js');

function canonicalUrl(html) {
  return html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
}

function isCurrentDetail(html, page) {
  return canonicalUrl(html) === `${BASE_URL}/kleurplaat/${page.slug}`
    && html.includes('id="detailPdf"')
    && html.includes('id="coloringPageData"')
    && html.includes('src="/js/coloring-detail.js"');
}

function upgradeDetail(html, page) {
  if (isCurrentDetail(html, page)) return html;
  const expectedUrl = `${BASE_URL}/kleurplaat/${page.slug}`;
  const existingUrl = canonicalUrl(html);
  if (!existingUrl || existingUrl.replace('https://kidslovecolor.com/', `${BASE_URL}/`) !== expectedUrl) {
    throw new Error(`Unexpected canonical route: ${page.slug}`);
  }
  const image = page.img.replace(/^\.\./, '');
  const redirect = html.match(/<meta http-equiv="refresh" content="0; url=\/"\/>\s*<script>\s*sessionStorage\.setItem\('spa_path', '([^']+)'\);\s*window\.location\.replace\('\/'\);\s*<\/script>/);
  if (redirect) {
    if (redirect[1] !== `/kleurplaat/${page.slug}`) throw new Error(`Unexpected redirect route: ${page.slug}`);
    if (!html.includes(`content="https://kidslovecolor.com${image}"`) && !html.includes(`content="${BASE_URL}${image}"`)) {
      throw new Error(`Unexpected redirect image: ${page.slug}`);
    }
    const rendered = renderDetail(page);
    const style = rendered.match(/<style>[\s\S]*?<\/style>/)[0];
    const body = rendered.match(/<body>[\s\S]*?<\/body>/)[0];
    const imageSchema = [...rendered.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].find(match => JSON.parse(match[1])['@type'] === 'ImageObject')[0];
    let updated = html.replaceAll('https://kidslovecolor.com/', `${BASE_URL}/`).replace(redirect[0], '');
    if (!updated.includes('"@type":"ImageObject"')) updated = updated.replace('</head>', `${imageSchema}\n</head>`);
    updated = updated.replace('</head>', `${style}\n</head>`).replace(/<body>[\s\S]*?<\/body>/, body);
    if (!isCurrentDetail(updated, page) || /http-equiv="refresh"|window\.location\.replace/.test(updated)) throw new Error(`Incomplete redirect upgrade: ${page.slug}`);
    return `${updated.trimEnd()}\n`;
  }
  if (!html.includes(`src="${image}"`)) throw new Error(`Unexpected preview image: ${page.slug}`);
  let updated = html.replaceAll('https://kidslovecolor.com/', `${BASE_URL}/`);
  if (!updated.includes('id="detailPdf"')) {
    const printButtons = [...updated.matchAll(/<button\b[^>]*onclick="window\.print\(\)"[^>]*>[^<]*<\/button>/g)];
    if (printButtons.length !== 1) throw new Error(`Expected one legacy print button: ${page.slug}`);
    const original = printButtons[0][0];
    const printButton = original.replace('onclick="window.print()"', 'id="detailPrint"');
    updated = updated.replace(original, `${printButton}\n          <button class="button secondary button-secondary" id="detailPdf" type="button">Download PDF</button>`);
  }
  if (!updated.includes('id="detailDownload"')) {
    const downloadLinks = [...updated.matchAll(/<a\b[^>]*\bdownload(?=[\s=>])[^>]*>/g)].filter(match => match[0].includes(`href="${image}"`));
    if (downloadLinks.length !== 1) throw new Error(`Expected one existing JPG link: ${page.slug}`);
    updated = updated.replace(downloadLinks[0][0], downloadLinks[0][0].replace('<a ', '<a id="detailDownload" '));
  }
  if (!updated.includes('id="actionStatus"')) {
    const actions = updated.match(/<div class="actions">[\s\S]*?<\/div>/);
    if (!actions) throw new Error(`Missing action section: ${page.slug}`);
    updated = updated.replace(actions[0], `${actions[0]}\n        <p id="actionStatus" role="status" aria-live="polite"></p>`);
  }
  if (!updated.includes('id="coloringPageData"')) {
    const data = JSON.stringify({
      slug: page.slug,
      title: page.nl.title,
      category: page.category,
      difficulty: page.difficulty,
      image,
      alt: page.nl.altText || page.nl.title,
      orientation: page.orientation || 'portrait',
      pdfFilename: `${page.slug}-kidslovecolor.pdf`,
    }).replaceAll('<', '\\u003c');
    updated = updated.replace('</body>', `  <script type="application/json" id="coloringPageData">${data}</script>\n</body>`);
  }
  if (!updated.includes('src="/js/coloring-detail.js"')) {
    updated = updated.replace('</body>', '  <script src="/js/coloring-detail.js" defer></script>\n</body>');
  }
  if (!updated.includes('overflow-wrap:anywhere')) {
    updated = updated.replace(/(\bh1\s*\{[^}]*)(\})/, '$1 overflow-wrap:anywhere; hyphens:auto; $2');
  }
  for (const identifier of ['detailPrint', 'detailPdf', 'detailDownload', 'actionStatus', 'coloringPageData']) {
    if (updated.split(`id="${identifier}"`).length !== 2) throw new Error(`Duplicate or missing ${identifier}: ${page.slug}`);
  }
  if (!isCurrentDetail(updated, page)) throw new Error(`Incomplete upgrade: ${page.slug}`);
  return `${updated.trimEnd()}\n`;
}

module.exports = { BASE_URL, canonicalUrl, isCurrentDetail, upgradeDetail };
