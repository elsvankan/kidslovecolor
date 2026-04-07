#!/usr/bin/env node
/**
 * add-coloring-page.js
 *
 * Adds a new coloring page to data.js automatically.
 *
 * Usage:
 *   node add-coloring-page.js <image-filename> <category> [difficulty]
 *
 * Example:
 *   node add-coloring-page.js tiger-roaring-mandala.jpg mandala medium
 *   node add-coloring-page.js clownfish-underwater.jpg oceaan easy
 *
 * Categories: dieren, oceaan, letters, mandala, gezichten, natuur, kawaii, kerst, halloween, voertuigen, sprookjes, sport
 * Difficulty: easy | medium | hard (default: medium)
 *
 * After running:
 *   1. Review the entry added to js/data.js
 *   2. Copy image to img/kleurplaten/ if not already there
 *   3. node generate-kleurplaat-pages.js   ← ALTIJD DOEN voor Pinterest!
 *   4. git add . && git commit -m "Add [name]" && git push
 *
 * Waarom generate-kleurplaat-pages.js?
 *   Pinterest voert geen JavaScript uit. Zonder pre-rendered HTML krijgt
 *   Pinterest een lege pagina en geeft 404 in de pin builder.
 *   Het script genereert echte HTML-pagina's met og:image voor elke kleurplaat.
 */

const fs = require('fs');
const path = require('path');

// --- Parse args ---
const [,, imgFile, category, difficulty = 'medium'] = process.argv;

if (!imgFile || !category) {
  console.error('Usage: node add-coloring-page.js <image-filename> <category> [difficulty]');
  console.error('Example: node add-coloring-page.js tiger-roaring.jpg dieren easy');
  process.exit(1);
}

// --- Derive slug from filename ---
const slug = imgFile.replace(/-coloring-page\.jpg$/, '').replace(/\.jpg$/, '');
const imgPath = `../img/kleurplaten/${slug}-coloring-page.jpg`;

// --- Slugs → human-readable title ---
function toTitle(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
const titleEn = toTitle(slug);

// --- Category → language-specific label ---
const categoryLabels = {
  dieren:      { nl: 'Dieren',   en: 'Animals',   fr: 'Animaux',   es: 'Animales', zh: '动物' },
  oceaan:      { nl: 'Oceaan',   en: 'Ocean',     fr: 'Océan',     es: 'Océano',   zh: '海洋' },
  letters:     { nl: 'Letters',  en: 'Letters',   fr: 'Lettres',   es: 'Letras',   zh: '字母' },
  mandala:     { nl: 'Mandala',  en: 'Mandala',   fr: 'Mandala',   es: 'Mandala',  zh: '曼陀罗' },
  gezichten:   { nl: 'Gezichten',en: 'Faces',     fr: 'Visages',   es: 'Caras',    zh: '面孔' },
  natuur:      { nl: 'Natuur',   en: 'Nature',    fr: 'Nature',    es: 'Naturaleza',zh: '自然' },
  kawaii:      { nl: 'Kawaii',   en: 'Kawaii',    fr: 'Kawaii',    es: 'Kawaii',   zh: '可爱' },
  kerst:       { nl: 'Kerst',    en: 'Christmas', fr: 'Noël',      es: 'Navidad',  zh: '圣诞节' },
  halloween:   { nl: 'Halloween',en: 'Halloween', fr: 'Halloween', es: 'Halloween',zh: '万圣节' },
  voertuigen:  { nl: 'Voertuigen',en: 'Vehicles', fr: 'Véhicules', es: 'Vehículos',zh: '车辆' },
  sprookjes:   { nl: 'Sprookjes',en: 'Fairy Tales',fr: 'Contes de fées',es: 'Cuentos de hadas',zh: '童话' },
  sport:       { nl: 'Sport',    en: 'Sports',    fr: 'Sport',     es: 'Deportes', zh: '运动' },
};

// --- Generate multilingual titles ---
const titles = {
  nl: toTitle(slug).replace(/([A-Z])/g, ' $1').trim(),  // will fix below
  en: titleEn,
  fr: titleEn,
  es: titleEn,
  zh: titleEn,
};

// Simple title translations per language
function makeTitle(lang, enTitle) {
  switch(lang) {
    case 'nl': return enTitle; // Same for now, user can edit
    case 'fr': return enTitle;
    case 'es': return enTitle;
    case 'zh': return enTitle;
    default:   return enTitle;
  }
}

// --- Generate descriptions ---
function makeDesc(lang, title) {
  const cat = categoryLabels[category] || {};
  switch(lang) {
    case 'nl': return `Gratis kleurplaat van ${title.toLowerCase()}. Leuk om in te kleuren voor kinderen!`;
    case 'en': return `Free coloring page of ${title.toLowerCase()}. Fun to color for kids!`;
    case 'fr': return `Page à colorier gratuite de ${title.toLowerCase()}. Amusant à colorier pour les enfants!`;
    case 'es': return `Página para colorear gratis de ${title.toLowerCase()}. ¡Divertido para colorear para niños!`;
    case 'zh': return `免费涂色页：${title}。适合儿童着色！`;
  }
}

function makeKeywords(lang, title) {
  switch(lang) {
    case 'nl': return `${title.toLowerCase()} kleurplaat gratis printen kinderen`;
    case 'en': return `${title.toLowerCase()} coloring page free printable kids`;
    case 'fr': return `${title.toLowerCase()} coloriage gratuit imprimer enfants`;
    case 'es': return `${title.toLowerCase()} colorear gratis imprimir niños`;
    case 'zh': return `${title} 涂色页 免费 儿童`;
  }
}

function makeAlt(lang, title) {
  switch(lang) {
    case 'nl': return `Gratis kleurplaat ${title.toLowerCase()}`;
    case 'en': return `Free coloring page ${title.toLowerCase()}`;
    case 'fr': return `Page à colorier ${title.toLowerCase()}`;
    case 'es': return `Página para colorear ${title.toLowerCase()}`;
    case 'zh': return `免费涂色页 ${title}`;
  }
}

// --- Read data.js to get next ID ---
const dataPath = path.join(__dirname, 'js', 'data.js');
const dataContent = fs.readFileSync(dataPath, 'utf8');

// Find all id: N occurrences
const ids = [...dataContent.matchAll(/\bid:\s*(\d+)/g)].map(m => parseInt(m[1]));
const nextId = Math.max(...ids) + 1;

console.log(`\n✅ New entry: id=${nextId}, slug="${slug}", category="${category}"`);

// --- Build the entry ---
const langs = ['nl', 'en', 'fr', 'es', 'zh'];
const langLines = langs.map(lang => {
  const title = makeTitle(lang, titleEn);
  return `    ${lang}: { title: '${title}', description: '${makeDesc(lang, title)}', keywords: '${makeKeywords(lang, title)}', altText: '${makeAlt(lang, title)}' },`;
}).join('\n');

const entry = `
  {
    id: ${nextId}, slug: '${slug}', category: '${category}', difficulty: '${difficulty}',
    img: '${imgPath}',
${langLines}
  },
`;

// --- Insert before closing ]; ---
const insertBefore = '\n];';
const insertPos = dataContent.lastIndexOf(insertBefore);
if (insertPos === -1) {
  console.error('❌ Could not find end of COLORINGS array in data.js');
  process.exit(1);
}

const newContent = dataContent.slice(0, insertPos) + entry + dataContent.slice(insertPos);
fs.writeFileSync(dataPath, newContent, 'utf8');

console.log(`✅ Added to js/data.js`);
console.log(`\n📋 Next steps:`);
console.log(`   1. Check: js/data.js (bottom of file)`);
console.log(`   2. Copy image: cp ~/Desktop/Kleurplaten/• met logo/${imgFile} img/kleurplaten/${slug}-coloring-page.jpg`);
console.log(`   3. Push: git add . && git commit -m "Add ${titleEn}" && git push`);
console.log(`\n💡 Tip: Edit titles/descriptions in data.js for better quality if needed.`);
