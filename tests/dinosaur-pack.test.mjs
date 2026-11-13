import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { THEMES, renderTheme } = require('../scripts/generate-theme-pages.cjs');
const { build } = require('../scripts/build-static.cjs');
const root = new URL('../', import.meta.url);
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('js/data.js', root), 'utf8') + '\nthis.rows = COLORINGS;', context);
const pack = THEMES.dinosaurussen.downloadPack;

test('Dinosaur pack has five unique existing published scientific-name colorings and five A4 pages', () => {
  assert.equal(pack.slugs.length, 5);
  assert.equal(new Set(pack.slugs).size, 5);
  for (const slug of pack.slugs) {
    const record = context.rows.find(item => item.slug === slug);
    assert.ok(record && !record.hidden && record.collections.includes('dinosaurussen'));
    assert.ok(record.scientificName && record.referenceUrl.startsWith('https://www.nhm.ac.uk/'));
  }
  const pdf = fs.readFileSync(new URL(pack.url.slice(1), root));
  assert.ok(pdf.subarray(0, 5).equals(Buffer.from('%PDF-')));
  assert.equal([...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length, 5);
});

for (const language of Object.keys(THEMES.dinosaurussen.paths)) {
  test(`Dinosaur pack is a direct accessible localized PDF download in ${language}`, () => {
    const html = renderTheme('dinosaurussen', THEMES.dinosaurussen, language, context.rows);
    const copy = pack.copy[language];
    assert.ok(html.includes(`href="${pack.url}" download="${path.basename(pack.url)}" type="application/pdf"`));
    assert.ok(html.includes(copy.heading));
    assert.ok(html.includes(copy.button));
    assert.ok(html.includes('aria-labelledby="pack-heading"'));
    assert.ok(html.includes('href="/css/theme-pages.css?v=dinosaur-letters-v1"'));
    assert.ok(html.includes('CollectionPage'));
  });
}

test('Other themes do not accidentally offer the dinosaur pack', () => {
  const html = renderTheme('prinsessen', THEMES.prinsessen, 'nl', context.rows);
  assert.ok(!html.includes(pack.url));
});

test('Compact build includes the exact PDF while still excluding coloring originals', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'klc-pack-test-'));
  try {
    fs.mkdirSync(path.join(temporary, 'js'));
    fs.copyFileSync(new URL('js/data.js', root), path.join(temporary, 'js/data.js'));
    fs.mkdirSync(path.join(temporary, 'downloads'));
    fs.copyFileSync(new URL(pack.url.slice(1), root), path.join(temporary, pack.url.slice(1)));
    fs.mkdirSync(path.join(temporary, 'img/kleurplaten'), { recursive: true });
    fs.writeFileSync(path.join(temporary, 'img/kleurplaten/not-for-deployment.jpg'), 'asset');
    const output = build(temporary);
    assert.deepEqual(fs.readFileSync(path.join(output, pack.url.slice(1))), fs.readFileSync(new URL(pack.url.slice(1), root)));
    assert.ok(!fs.existsSync(path.join(output, 'img/kleurplaten')));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
