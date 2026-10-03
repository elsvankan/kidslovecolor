import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../js/coloring-detail.js', import.meta.url), 'utf8');

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
