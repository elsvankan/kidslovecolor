import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const catalogSource = fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function openGallery(category, randomValue) {
  const grid = {innerHTML: '', classList: {toggle() {}}, querySelectorAll: () => []};
  let selectCategory;
  const button = {
    dataset: {cat: category},
    addEventListener: (name, callback) => { selectCategory = callback; },
    classList: {toggle() {}},
    setAttribute() {},
  };
  const nav = {innerHTML: '', querySelectorAll: () => [button]};
  const context = vm.createContext({
    URLSearchParams,
    Math: Object.assign(Object.create(Math), {random: () => randomValue}),
    window: {location: {pathname: '/', search: '?cat=' + category}, matchMedia: () => ({matches: false})},
    history: {replaceState() {}},
    document: {
      documentElement: {lang: 'nl'},
      getElementById: id => id === 'coloringGrid' ? grid : id === 'categoryNav' ? nav : null,
      addEventListener() {},
    },
  });
  vm.runInContext(catalogSource + '\n' + appSource, context);
  const run = code => vm.runInContext(code, context);
  const ids = () => Array.from(grid.innerHTML.matchAll(/data-id="(\d+)"/g), match => Number(match[1]));
  run('updateSEO = () => {}; initializeGridViewFromUrl(); renderCategories(); renderGrid();');
  return {ids, run, reselect: () => selectCategory(), useRandom: value => { randomValue = value; }};
}

test('category order changes on entry or reselection and survives filtering', () => {
  const first = openGallery('kawaii', 0);
  const otherVisit = openGallery('kawaii', 0.99);
  const originalOrder = first.ids();
  assert.ok(originalOrder.length > 10);
  assert.notDeepEqual(originalOrder, otherVisit.ids());
  assert.deepEqual(new Set(originalOrder), new Set(otherVisit.ids()));
  assert.equal(new Set(originalOrder).size, originalOrder.length);

  first.run("searchQuery = 'surprise'; renderGrid();");
  const matches = new Set(first.ids());
  assert.ok(matches.size > 0 && matches.size < originalOrder.length);
  assert.deepEqual(first.ids(), originalOrder.filter(id => matches.has(id)));
  first.run("searchQuery = ''; renderGrid();");
  assert.deepEqual(first.ids(), originalOrder);

  first.useRandom(0.99);
  first.reselect();
  assert.deepEqual(first.ids(), otherVisit.ids());
});

test('Nieuw still shows the 24 newest public coloring pages', () => {
  const gallery = openGallery('nieuw', 0);
  const expected = Array.from(gallery.run(
    "COLORINGS.filter(item => !item.hidden && item.category !== 'actualiteiten').map(item => item.id).sort((a, b) => b - a).slice(0, 24)"
  ));
  assert.equal(gallery.ids().length, 24);
  assert.deepEqual(gallery.ids(), expected);
});

test('The homepage shows the real newest items and previews the newest visible member of each category', () => {
  const gallery = openGallery('all', 0);
  gallery.run('gridHasExpanded = false; renderGrid();');
  const expected = Array.from(gallery.run('getGridColorings().slice(0, 8).map(item => item.id)'));
  assert.deepEqual(gallery.ids(), expected);

  const cards = JSON.parse(gallery.run('JSON.stringify(getHomepageCategoryPreviews(getGridColorings()))'));
  const princesses = cards.find(({href}) => href === '/prinsessen');
  const latestPrincess = gallery.run("getGridColorings().find(item => item.category === 'prinsessen').id");
  assert.equal(princesses.item.id, latestPrincess);
  const surprise = cards.find(({href}) => href.includes('cat=surprise_minipoppen'));
  const latestDoll = gallery.run("getGridColorings().find(item => item.collections?.includes('surprise_minipoppen')).id");
  assert.equal(surprise.item.id, latestDoll);
  assert.ok(cards.every(({item}) => !item.hidden && item.category !== 'actualiteiten'));
});
