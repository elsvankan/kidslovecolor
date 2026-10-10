import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { renderTheme, THEMES } = require('../scripts/generate-theme-pages.cjs');
const root = new URL('../', import.meta.url);
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('js/data.js', root), 'utf8') + '\nthis.catalog = {categories: CATEGORIES, colorings: COLORINGS};', context);
const theme = THEMES.prinsessen;
const colorings = context.catalog.colorings;

test('Princess pilot is a static curated landing with all existing gallery records preserved', () => {
  const html = renderTheme('prinsessen', theme, 'nl', colorings);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const list = schema['@graph'].find(entry => entry['@type'] === 'ItemList');
  assert.equal(list.numberOfItems, 4);
  assert.equal(colorings.filter(entry => entry.category === 'prinsessen').length, 22);
  assert.equal(colorings.length, 696);
  assert.ok(html.includes('href="/?cat=prinsessen"'));
  assert.ok(html.includes('href="https://www.kidslovecolor.com/prinsessen"'));
  assert.ok(html.includes(theme.copy.nl.heading));
  assert.ok(!html.includes('voor meisjes'));
  assert.ok(!context.catalog.categories.prinsessen.landingPaths);
  for (const slug of theme.coloringSlugs) {
    assert.ok(html.includes(`/kleurplaat/${slug}`));
    const detail = fs.readFileSync(new URL(`kleurplaat/${slug}/index.html`, root), 'utf8');
    assert.ok(detail.includes('id="detailPdf"'));
    assert.ok(detail.includes('href="/prinsessen"'));
    assert.ok(detail.includes(`href="https://www.kidslovecolor.com/kleurplaat/${slug}"`));
  }
});

test('Curated landing does not accidentally promote hidden, news or other-category records', () => {
  const original = colorings.find(entry => entry.slug === theme.coloringSlugs[0]);
  assert.throws(() => renderTheme('prinsessen', theme, 'nl', [{ ...original, hidden: true }]), /no published coloring records/);
  assert.throws(() => renderTheme('prinsessen', theme, 'nl', [{ ...original, category: 'actualiteiten' }]), /no published coloring records/);
  assert.throws(() => renderTheme('prinsessen', theme, 'nl', [{ ...original, category: 'dieren' }]), /no published coloring records/);
  const html = renderTheme('prinsessen', theme, 'nl', colorings);
  assert.ok(!html.includes('/kleurplaat/princess-sleeping-in-a-castle-tower'));
});

test('Princess pilot is discoverable without changing the full gallery canonical or adding tracking', () => {
  assert.ok(fs.readFileSync(new URL('index.html', root), 'utf8').includes('href="/prinsessen"'));
  assert.ok(fs.readFileSync(new URL('sitemap.xml', root), 'utf8').includes('<loc>https://www.kidslovecolor.com/prinsessen</loc>'));
  const html = renderTheme('prinsessen', theme, 'nl', colorings);
  assert.ok(!html.includes('googletagmanager.com'));
  assert.deepEqual(Object.keys(theme.paths), ['nl']);
});
