#!/usr/bin/env node
/**
 * Eenmalig: regenereert alle kleurplaat/[slug]/index.html pagina's met
 * de huidige buildSeoPage() (nu inclusief BreadcrumbList structured data),
 * gebaseerd op de actuele data in js/data.js.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { buildSeoPage, CAT_DESC } = require('../add-colorings.js');

const ROOT     = path.join(__dirname, '..');
const DATA_JS  = path.join(ROOT, 'js/data.js');
const SLUG_DIR = path.join(ROOT, 'kleurplaat');

const dataContent = fs.readFileSync(DATA_JS, 'utf8');

// Zelfde regex-aanpak als getAllEntries() in add-colorings.js
const re = /slug:\s*'([^']+)'.*?img:\s*'[^']*?([^/']+\.jpg)'.*?nl:\s*\{[^}]*?title:\s*'((?:[^'\\]|\\.)*)'[^}]*?description:\s*'((?:[^'\\]|\\.)*?)'/gs;
const catRe = /category:\s*'([^']+)'/;

let count = 0;
let m;
const blockRe = /\{\s*id:\s*\d+,\s*slug:\s*'([^']+)',\s*category:\s*'([^']+)',\s*difficulty:\s*'([^']+)'[\s\S]*?nl:\s*\{[^}]*?title:\s*'((?:[^'\\]|\\.)*)'[^}]*?description:\s*'((?:[^'\\]|\\.)*?)'[^}]*?\}/g;

while ((m = blockRe.exec(dataContent)) !== null) {
  const [, slug, category, , titleRaw, descRaw] = m;
  const nlTitle = titleRaw.replace(/\\'/g, "'");
  const nlDesc  = descRaw.replace(/\\'/g, "'");

  const parsed = { slug, category, filename: slug + '.jpg' };
  // filename in de meta-tags moet naar de echte afbeelding wijzen —
  // haal het echte img-pad uit hetzelfde blok
  const imgMatch = m[0].match(/img:\s*'\.\.\/img\/kleurplaten\/([^']+)'/);
  if (imgMatch) parsed.filename = imgMatch[1];

  const slugDir = path.join(SLUG_DIR, slug);
  fs.mkdirSync(slugDir, { recursive: true });
  fs.writeFileSync(path.join(slugDir, 'index.html'), buildSeoPage(parsed, nlTitle, nlDesc), 'utf8');
  count++;
}

console.log(`✅ ${count} SEO-pagina's geregenereerd met breadcrumb structured data.`);
