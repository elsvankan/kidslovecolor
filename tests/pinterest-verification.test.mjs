import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('Homepage contains exactly one Pinterest ownership tag inside its head', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert.ok(head, 'Homepage must contain a head section');
  const tags = [...html.matchAll(/<meta\b[^>]*name="p:domain_verify"[^>]*>/g)];
  assert.equal(tags.length, 1);
  assert.ok(head.includes(tags[0][0]));
  assert.match(tags[0][0], /content="11dcc8704cfa405646dbc0001fcf9313"/);
});
