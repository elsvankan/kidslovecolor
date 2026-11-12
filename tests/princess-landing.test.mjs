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
const {categories, colorings} = context.catalog;

test('Princess landing lists all and only public princess coloring pages', () => {
  const html = renderTheme('prinsessen', theme, 'nl', colorings);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const list = schema['@graph'].find(entry => entry['@type'] === 'ItemList');
  const expected = colorings.filter(entry => entry.category === 'prinsessen' && !entry.hidden);
  assert.ok(expected.length > 4);
  assert.equal(list.numberOfItems, expected.length);
  assert.deepEqual(list.itemListElement.map(entry => entry.url), Array.from(expected, ({slug}) => 'https://www.kidslovecolor.com/kleurplaat/' + slug));
  for (const {slug} of expected) {
    assert.ok(html.includes('href="/kleurplaat/' + slug + '"'));
    const detail = fs.readFileSync(new URL('kleurplaat/' + slug + '/index.html', root), 'utf8');
    assert.ok(detail.includes('id="detailPdf"'));
  }

  const original = expected[0];
  for (const entry of [{ ...original, hidden: true }, { ...original, category: 'actualiteiten' }, { ...original, category: 'dieren' }]) {
    assert.throws(() => renderTheme('prinsessen', theme, 'nl', [entry]), /no published coloring records/);
  }
});

test('The full princess collection has a stable Dutch URL and returns to the category cards', () => {
  assert.equal(categories.prinsessen.landingPaths.nl, '/prinsessen');
  assert.ok(fs.readFileSync(new URL('sitemap.xml', root), 'utf8').includes('<loc>https://www.kidslovecolor.com/prinsessen</loc>'));
  const html = renderTheme('prinsessen', theme, 'nl', colorings);
  assert.ok(html.includes('href="https://www.kidslovecolor.com/prinsessen"'));
  assert.ok(html.includes('href="/#categorieen"'));
  assert.ok(!html.includes('googletagmanager.com'));
});
