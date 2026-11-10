import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../js/coloring-detail.js', import.meta.url), 'utf8');

const analyticsPreference = 'klc-detail-statistics-v1';
const analyticsDisable = 'ga-disable-G-SKLBTW5Z87';

function loadDetailWithAnalytics(initialChoice) {
  const handlers = {};
  const scripts = [];
  const feedback = {};
  const buttons = ['allow', 'deny'].map(choice => ({
    addEventListener: (event, listener) => { handlers[choice] = listener; },
  }));
  const preferences = {
    querySelectorAll: () => buttons,
    querySelector: selector => selector === 'summary' ? {focus() {}} : feedback,
  };
  const storage = new Map(initialChoice ? [[analyticsPreference, initialChoice]] : []);
  const browser = {
    location: {href: 'https://www.kidslovecolor.com/kleurplaat/test-art?utm_source=Pinterest&utm_medium=organic&email=test%40example.com&utm_campaign=test%40example.com#section'},
    localStorage: {
      getItem: key => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    },
    addEventListener: (event, listener) => { handlers[event] = listener; },
  };
  const elements = {
    coloringPageData: {textContent: '{"slug":"test-art","image":"/img/test.jpg"}'},
    actionStatus: {parentNode: {}, insertAdjacentElement() {}},
    detailDownload: {addEventListener: (event, listener) => { handlers.jpg = listener; }},
  };
  vm.runInNewContext(source, {
    URL, URLSearchParams, console, window: browser,
    document: {
      getElementById: id => elements[id],
      addEventListener: (event, listener) => listener(),
      createElement: name => name === 'details' ? preferences : {},
      referrer: 'https://nl.pinterest.com/pin/123/?other=secret',
      head: {appendChild: script => scripts.push(script)},
    },
  });
  return {handlers, scripts, storage, browser, preferences, commands: () => Array.from(browser.dataLayer || [], args => Array.from(args))};
}

test('detail analytics waits for a choice and keeps only valid campaign parameters', () => {
  const detail = loadDetailWithAnalytics();
  assert.equal(detail.preferences.open, true);
  detail.handlers.jpg();
  assert.deepEqual(detail.commands(), []);
  assert.equal(detail.scripts.length, 0);

  detail.handlers.allow();
  assert.equal(detail.storage.get(analyticsPreference), 'allow');
  assert.equal(detail.browser[analyticsDisable], false);
  assert.equal(detail.scripts.length, 1);
  assert.equal(detail.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-SKLBTW5Z87');
  const [defaults, consent, , config, opening] = detail.commands();
  assert.equal(defaults[2].analytics_storage, 'denied');
  assert.equal(defaults[2].ad_storage, 'denied');
  assert.equal(consent[2].analytics_storage, 'granted');
  assert.equal(config[1], 'G-SKLBTW5Z87');
  assert.equal(config[2].page_location, 'https://www.kidslovecolor.com/kleurplaat/test-art?utm_source=Pinterest&utm_medium=organic');
  assert.equal(config[2].page_referrer, 'https://nl.pinterest.com/');
  assert.equal(config[2].allow_google_signals, false);
  assert.equal(config[2].allow_ad_personalization_signals, false);
  assert.equal(opening[1], 'coloring_open');
  detail.handlers.jpg();
  assert.equal(detail.commands().at(-1)[2].download_format, 'jpg');
});

test('saved refusal and withdrawal stop detail analytics without loading a second tag', () => {
  const denied = loadDetailWithAnalytics('deny');
  assert.equal(denied.preferences.open, false);
  denied.handlers.jpg();
  assert.deepEqual(denied.commands(), []);
  assert.equal(denied.scripts.length, 0);

  const accepted = loadDetailWithAnalytics('allow');
  assert.equal(accepted.scripts.length, 1);
  accepted.handlers.deny();
  assert.equal(accepted.storage.get(analyticsPreference), 'deny');
  assert.equal(accepted.browser[analyticsDisable], true);
  const before = accepted.commands().length;
  accepted.handlers.jpg();
  assert.equal(accepted.commands().length, before);
  accepted.handlers.allow();
  assert.equal(accepted.scripts.length, 1);
  accepted.handlers.storage({key: analyticsPreference, newValue: 'deny'});
  assert.equal(accepted.browser[analyticsDisable], true);
});

for (const orientation of ['portrait', 'landscape']) {
  test(`PDF keeps image proportions and printer margins: ${orientation}`, async () => {
    const callbacks = {};
    const elements = {};
    for (const identifier of ['detailPdf', 'detailPrint', 'detailDownload', 'actionStatus']) {
      elements[identifier] = {addEventListener: (event, callback) => { callbacks[identifier] = callback; }};
    }
    elements.coloringPageData = {textContent: JSON.stringify({slug: 'test-art', image: '/img/test.jpg', orientation})};
    let placedImage;
    let savedFilename;
    class Pdf {
      getImageProperties() { return {width: 1200, height: 900}; }
      addImage(...values) { placedImage = values; }
      save(filename) { savedFilename = filename; }
    }
    class Reader {
      readAsDataURL() { this.result = 'data:image/jpeg;base64,test'; this.onload(); }
    }
    const context = {
      console,
      URL,
      FileReader: Reader,
      fetch: async () => ({ok: true, blob: async () => ({})}),
      window: {location: {origin: 'https://www.kidslovecolor.com'}, jspdf: {jsPDF: Pdf}},
      document: {getElementById: identifier => elements[identifier], addEventListener: (event, callback) => callback()},
    };
    vm.runInNewContext(source, context);
    await callbacks.detailPdf();
    const [, , horizontal, vertical, width, height] = placedImage;
    assert.ok(horizontal >= 8 && vertical >= 8);
    assert.ok(horizontal + width <= (orientation === 'landscape' ? 297 : 210) - 8 + 0.001);
    assert.ok(vertical + height <= (orientation === 'landscape' ? 210 : 297) - 8 + 0.001);
    assert.ok(Math.abs(width / height - 1200 / 900) < 0.001);
    assert.equal(savedFilename, 'test-art-kidslovecolor.pdf');
    assert.equal(elements.detailPdf.disabled, false);
  });
}
