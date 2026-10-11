import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { upgradeDetail, isCurrentDetail } = require('../lib/coloring-detail-upgrade.cjs');
const page = {slug: 'test-art', img: '../img/kleurplaten/test.jpg', category: 'dieren', difficulty: 'easy', nl: {title: 'Dier & Ster', description: 'Bestaande beschrijving', altText: 'Bestaande alternatieve tekst'}};
const legacy = `<!doctype html><html lang="nl"><head>
<meta name="description" content="Bestaande beschrijving">
<meta name="robots" content="noindex">
<link rel="canonical" href="https://kidslovecolor.com/kleurplaat/test-art">
<meta property="og:url" content="https://kidslovecolor.com/kleurplaat/test-art">
<script type="application/ld+json">{"@type":"ImageObject","contentUrl":"https://kidslovecolor.com/img/kleurplaten/test.jpg","width":1200,"height":900,"license":"https://creativecommons.org/licenses/by-nc/4.0/"}</script>
<style>h1 {font-weight:500;}</style></head><body>
<h1>Dier &amp; Ster</h1><p class="lead">Bestaande beschrijving</p>
<img src="/img/kleurplaten/test.jpg" alt="Bestaande alternatieve tekst" width="1200" height="900">
<div class="actions">
<button class="button button-primary" type="button" onclick="window.print()">Print deze kleurplaat</button>
<a class="button button-secondary" href="/img/kleurplaten/test.jpg" download>Download als JPG</a>
<a href="/?kleurplaat=test-art">Open in de kleurplatengalerij</a>
</div>
<section class="news-context"><h2>Verhaal</h2><p>Oorspronkelijk nieuws.</p><ul><li>Weetje</li></ul><a href="https://example.org/source">Bron</a></section>
</body></html>`;
const redirect = `<!doctype html><html lang="nl"><head>
<title>Behouden paginatitel</title><meta name="description" content="Behouden beschrijving">
<link rel="canonical" href="https://kidslovecolor.com/kleurplaat/test-art">
<meta property="og:image" content="https://kidslovecolor.com/img/kleurplaten/test.jpg">
<script type="application/ld+json">{"@type":"BreadcrumbList","custom":"Behouden waarde"}</script>
<meta http-equiv="refresh" content="0; url=/"/>
<script>
sessionStorage.setItem('spa_path', '/kleurplaat/test-art');
window.location.replace('/');
</script></head><body><p>Laden…</p></body></html>`;

test('Recognized SPA stub becomes a complete detail on its existing route and keeps head metadata', () => {
  const updated = upgradeDetail(redirect, {...page, nl: {...page.nl, newsExplainer: 'Bestaande nieuwscontext'}});
  assert.ok(isCurrentDetail(updated, page));
  assert.ok(!updated.includes('http-equiv="refresh"'));
  assert.ok(!updated.includes('window.location.replace'));
  for (const preserved of ['<title>Behouden paginatitel</title>', 'content="Behouden beschrijving"', '"custom":"Behouden waarde"', 'Bestaande nieuwscontext']) assert.ok(updated.includes(preserved));
  assert.ok(updated.includes('<h1>Dier &amp; Ster</h1>'));
  assert.equal(upgradeDetail(updated, page), updated);
  assert.throws(() => upgradeDetail(redirect.replace("'spa_path', '/kleurplaat/test-art'", "'spa_path', '/kleurplaat/other'"), page), /redirect route/);
});

test('Legacy upgrade adds PDF and preferred canonical without losing existing content or metadata', () => {
  const updated = upgradeDetail(legacy, page);
  assert.ok(isCurrentDetail(updated, page));
  assert.ok(!updated.includes('https://kidslovecolor.com/'));
  for (const preserved of ['<h1>Dier &amp; Ster</h1>', '<meta name="description" content="Bestaande beschrijving">', '<meta name="robots" content="noindex">', 'width="1200" height="900"', '"width":1200,"height":900', 'https://creativecommons.org/licenses/by-nc/4.0/', 'href="/?kleurplaat=test-art"', legacy.match(/<section class="news-context">[\s\S]*?<\/section>/)[0]]) {
    assert.ok(updated.includes(preserved), preserved);
  }
  assert.ok(updated.includes('id="detailPrint"'));
  assert.ok(updated.includes('id="detailDownload"'));
  assert.ok(updated.includes('role="status" aria-live="polite"'));
  const data = JSON.parse(updated.match(/id="coloringPageData">(.*?)<\/script>/s)[1]);
  assert.equal(data.image, '/img/kleurplaten/test.jpg');
  assert.equal(data.title, page.nl.title);
  assert.equal(data.pdfFilename, 'test-art-kidslovecolor.pdf');
});

test('Upgrade is idempotent and never overwrites an already current custom page', () => {
  const current = upgradeDetail(legacy, page).replace('Oorspronkelijk nieuws.', 'Een behouden speciale uitleg.');
  assert.equal(upgradeDetail(current, page), current);
});

test('Alternate legacy layout keeps its named JPG download and adds the shared PDF control', () => {
  const alternate = legacy.replace(' download>', ' download="existing-name.jpg">').replace('button button-primary', 'button secondary');
  const updated = upgradeDetail(alternate, page);
  assert.ok(isCurrentDetail(updated, page));
  assert.ok(updated.includes('download="existing-name.jpg"'));
});

test('Upgrade refuses mismatched routes, images, malformed controls and duplicate IDs', () => {
  assert.throws(() => upgradeDetail(legacy, {...page, slug: 'other'}), /canonical route/);
  assert.throws(() => upgradeDetail(legacy, {...page, img: '../img/kleurplaten/other.jpg'}), /preview image/);
  assert.throws(() => upgradeDetail(legacy.replace('onclick="window.print()"', ''), page), /print button/);
  assert.throws(() => upgradeDetail(legacy.replace('</body>', '<p id="detailPrint"></p></body>'), page), /Duplicate/);
});

test('New action data keeps orientation and cannot close its JSON script', () => {
  const updated = upgradeDetail(legacy, {...page, orientation: 'landscape', nl: {...page.nl, title: 'Mini </script> <script>alert(1)</script>'}});
  const data = updated.match(/id="coloringPageData">(.*?)<\/script>/s)[1];
  assert.ok(!data.includes('<'));
  assert.equal(JSON.parse(data).orientation, 'landscape');
  assert.equal(JSON.parse(data).title, 'Mini </script> <script>alert(1)</script>');
});

test('CLI produces reviewable output and never changes input routes, catalog or Vercel rules', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'klc-detail-upgrade-'));
  try {
    for (const directory of ['lib', 'scripts', 'js', 'kleurplaat/test-art']) fs.mkdirSync(path.join(temporary, directory), {recursive: true});
    for (const relative of ['lib/coloring-detail-upgrade.cjs', 'lib/theme-pages.cjs', 'generate-kleurplaat-pages.js', 'scripts/upgrade-coloring-details.cjs']) fs.copyFileSync(new URL('../' + relative, import.meta.url), path.join(temporary, relative));
    const data = `const COLORINGS = ${JSON.stringify([page])};`;
    const config = '{"rewrites":[{"source":"/old","destination":"/keep"}]}';
    fs.writeFileSync(path.join(temporary, 'js/data.js'), data);
    fs.writeFileSync(path.join(temporary, 'vercel.json'), config);
    fs.writeFileSync(path.join(temporary, 'kleurplaat/test-art/index.html'), legacy);
    const result = spawnSync(process.execPath, ['scripts/upgrade-coloring-details.cjs', '--out=generated', '--slug=test-art'], {cwd: temporary, encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).upgrades, 1);
    assert.ok(isCurrentDetail(fs.readFileSync(path.join(temporary, 'generated/kleurplaat/test-art/index.html'), 'utf8'), page));
    assert.equal(fs.readFileSync(path.join(temporary, 'kleurplaat/test-art/index.html'), 'utf8'), legacy);
    assert.equal(fs.readFileSync(path.join(temporary, 'js/data.js'), 'utf8'), data);
    assert.equal(fs.readFileSync(path.join(temporary, 'vercel.json'), 'utf8'), config);
    const unknown = spawnSync(process.execPath, ['scripts/upgrade-coloring-details.cjs', '--out=generated', '--slug=unknown'], {cwd: temporary, encoding: 'utf8'});
    assert.notEqual(unknown.status, 0);
    assert.match(unknown.stderr, /Unknown coloring slug/);
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
});

test('Detail generation leaves existing routing unchanged unless route synchronization is explicit', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'klc-detail-generator-'));
  try {
    for (const directory of ['lib', 'js']) fs.mkdirSync(path.join(temporary, directory), {recursive: true});
    for (const relative of ['lib/theme-pages.cjs', 'generate-kleurplaat-pages.js']) fs.copyFileSync(new URL('../' + relative, import.meta.url), path.join(temporary, relative));
    fs.writeFileSync(path.join(temporary, 'js/data.js'), `const COLORINGS = [\n${JSON.stringify(page)}\n];`);
    const config = '{"rewrites":[{"source":"/old","destination":"/keep"}]}';
    fs.writeFileSync(path.join(temporary, 'vercel.json'), config);
    for (const options of [['--new-only'], ['--slug=test-art']]) {
      const result = spawnSync(process.execPath, ['generate-kleurplaat-pages.js', ...options], {cwd: temporary, encoding: 'utf8'});
      assert.equal(result.status, 0, result.stderr);
      assert.equal(fs.readFileSync(path.join(temporary, 'vercel.json'), 'utf8'), config);
    }
    const result = spawnSync(process.execPath, ['generate-kleurplaat-pages.js', '--new-only', '--sync-routes'], {cwd: temporary, encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    const rules = JSON.parse(fs.readFileSync(path.join(temporary, 'vercel.json'), 'utf8')).rewrites;
    assert.deepEqual(rules[0], {source: '/old', destination: '/keep'});
    assert.ok(rules.some(rule => rule.source === '/kleurplaat/test-art'));
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
});
