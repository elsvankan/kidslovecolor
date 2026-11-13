'use strict';

const galleryViews = new Set(['all', 'nieuw']);
const letterCollections = new Map([
  ['dino', 'dinosaurussen'],
  ['surprise', 'surprise_minipoppen'],
]);

function validateCatalogCategories(colorings, categories) {
  const errors = [];
  for (const { slug, category, collections = [], letterStyle } of colorings) {
    if (typeof category !== 'string' || !Object.hasOwn(categories, category) || galleryViews.has(category)) {
      errors.push(`${slug}: unknown primary category ${JSON.stringify(category)}`);
    }
    if (!Array.isArray(collections)) {
      errors.push(`${slug}: collections must be an array`);
      continue;
    }
    const unique = new Set(collections);
    if (unique.size !== collections.length) errors.push(`${slug}: duplicate collection tags`);
    for (const tag of unique) {
      if (typeof tag !== 'string' || !Object.hasOwn(categories, tag) || galleryViews.has(tag) || tag === 'actualiteiten' || tag === category) {
        errors.push(`${slug}: invalid collection tag ${JSON.stringify(tag)}`);
      }
    }
    const requiredCollection = letterCollections.get(letterStyle);
    if (requiredCollection && (category !== 'letters' || !unique.has(requiredCollection))) {
      errors.push(`${slug}: ${letterStyle} letters require category letters and collection ${requiredCollection}`);
    }
  }
  if (errors.length) throw new Error('Invalid coloring page categories:\n' + errors.join('\n'));
}

module.exports = { validateCatalogCategories };
