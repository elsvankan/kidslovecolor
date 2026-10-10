import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { renderTheme, writeThemePages, THEMES } = require('../scripts/generate-theme-pages.cjs');
const { build } = require('../scripts/build-static.cjs');
const root = new URL('../', import.meta.url);
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('js/data.js', root), 'utf8') + '\nthis.catalog = {categories: CATEGORIES, colorings: COLORINGS};', context);
const theme = THEMES.dinosaurussen;
const colorings = context.catalog.colorings;
const dinosaurs = colorings.filter(item => item.collections?.includes('dinosaurussen') && !item.hidden && item.category !== 'actualiteiten');

for (const language of Object.keys(theme.paths)) {
  test(`Dinosaur landing is static, linked and localized in ${language}`, () => {
    const html = renderTheme('dinosaurussen', theme, language, colorings);
    assert.ok(html.includes(`<html lang="${language}">`));
    assert.ok(html.includes(`<link rel="canonical" href="https://www.kidslovecolor.com${theme.paths[language]}"`));
    assert.ok(html.includes(theme.copy[language].heading));
    for (const route of Object.values(theme.paths)) assert.ok(html.includes(`href="https://www.kidslovecolor.com${route}"`));
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    const list = schema['@graph'].find(item => item['@type'] === 'ItemList');
    assert.equal(list.numberOfItems, dinosaurs.length);
    assert.equal(list.itemListElement.length, dinosaurs.length);
    for (const dinosaur of dinosaurs) {
      assert.ok(html.includes(`/kleurplaat/${dinosaur.slug}`));
      assert.ok(html.includes(dinosaur.scientificName));
      assert.ok(html.includes(dinosaur.learningFact[language]));
      assert.ok(html.includes(dinosaur.referenceUrl));
      assert.ok(fs.existsSync(new URL(`kleurplaat/${dinosaur.slug}/index.html`, root)));
      assert.equal(dinosaur.category, 'dieren');
    }
    assert.equal(context.catalog.categories.dinosaurussen.landingPaths[language], theme.paths[language]);
  });
}

test('Landing excludes hidden records and news, and escapes HTML safely', () => {
  const original = dinosaurs[0];
  const fixture = JSON.parse(JSON.stringify(original));
  fixture.nl.title = '<img src=x onerror="bad()">';
  fixture.scientificName = '</script><script>bad()</script>';
  const html = renderTheme('dinosaurussen', theme, 'nl', [fixture, { ...original, slug: 'hidden-record', hidden: true }, { ...original, slug: 'news-record', category: 'actualiteiten' }]);
  assert.ok(html.includes('&lt;img src=x onerror=&quot;bad()&quot;&gt;'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('</script><script>bad()'));
  assert.ok(!html.includes('/kleurplaat/hidden-record'));
  assert.ok(!html.includes('/kleurplaat/news-record'));
  assert.throws(() => renderTheme('dinosaurussen', theme, 'nl', []), /no published coloring records/);
});

test('Theme navigation uses real landing links and preserves collection matching', () => {
  const app = fs.readFileSync(new URL('js/app.js', root), 'utf8');
  assert.ok(app.includes('href="${cat.landingPaths[currentLang]}"'));
  assert.ok(app.includes("nav.querySelectorAll('button.cat-btn')"));
  assert.ok(app.includes('item.collections.includes(category)'));
  for (const [language, route] of Object.entries(theme.paths)) {
    const index = language === 'nl' ? 'index.html' : language + '/index.html';
    assert.ok(fs.readFileSync(new URL(index, root), 'utf8').includes(`href="${route}"`));
    assert.ok(fs.readFileSync(new URL('sitemap.xml', root), 'utf8').includes(`<loc>https://www.kidslovecolor.com${route}</loc>`));
  }
});

test('Compact build regenerates all theme pages and never copies coloring assets', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'klc-theme-test-'));
  try {
    fs.mkdirSync(path.join(temporary, 'js'));
    fs.copyFileSync(new URL('js/data.js', root), path.join(temporary, 'js/data.js'));
    fs.mkdirSync(path.join(temporary, 'img/kleurplaten'), { recursive: true });
    fs.writeFileSync(path.join(temporary, 'img/kleurplaten/not-for-deployment.jpg'), 'asset');
    assert.equal(writeThemePages(temporary).length, 5);
    const output = build(temporary);
    for (const route of Object.values(theme.paths)) {
      const html = fs.readFileSync(path.join(output, route.slice(1), 'index.html'), 'utf8');
      assert.ok(html.includes('CollectionPage'));
      assert.ok(html.includes('/kleurplaat/' + dinosaurs[0].slug));
    }
    assert.ok(!fs.existsSync(path.join(output, 'img/kleurplaten')));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
