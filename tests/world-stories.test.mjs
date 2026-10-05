import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const sources = ['js/data.js', 'vandaag-op-aarde/stories.js', 'vandaag-op-aarde/translations.js', 'vandaag-op-aarde/archive.js'];

for (const language of ['nl', 'en', 'fr', 'es', 'zh']) {
  test(`World stories render sources, references and coloring links in ${language}`, () => {
    const archive = { innerHTML: '' };
    const context = {
      window: {},
      document: {
        documentElement: { lang: language },
        querySelector: () => null,
        getElementById: (identifier) => identifier === 'editionArchive' ? archive : null,
      },
    };
    vm.createContext(context);
    for (const path of sources) vm.runInContext(fs.readFileSync(new URL(path, root), 'utf8'), context);
    const editions = vm.runInContext('WORLD_STORY_EDITIONS', context);
    for (const story of editions[0].stories) {
      assert.ok(archive.innerHTML.includes(`id="${story.slug}"`));
      assert.ok(archive.innerHTML.includes(story.coloringSlug));
      for (const source of story.sources) assert.ok(archive.innerHTML.includes(source.url.replaceAll('&', '&amp;')));
      assert.ok(archive.innerHTML.includes(story.referenceUrl.replaceAll('&', '&amp;')));
      const translated = language === 'nl' ? story : vm.runInContext(`WORLD_STORY_TRANSLATIONS.${language}[${JSON.stringify(story.slug)}]`, context);
      assert.equal(translated.facts.length, 3);
      for (const field of ['title', 'location', 'reportedDate', 'theme', 'intro', 'body', 'question']) assert.ok(translated[field]);
      assert.ok(archive.innerHTML.includes(translated.title));
    }
    assert.ok(archive.innerHTML.includes(editions.at(-1).published));
  });
}
