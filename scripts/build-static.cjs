'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { writeThemePages, THEMES } = require('./generate-theme-pages.cjs');

function build(root) {
  writeThemePages(root);
  const output = path.join(root, 'dist');
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  const themeDirectories = Object.values(THEMES).flatMap(theme => Object.values(theme.paths)).map(route => route.split('/')[1]);
  const directories = new Set(['css', 'js', 'img', 'svg', 'en', 'es', 'fr', 'zh', 'kleurplaat', 'vandaag-op-aarde', ...themeDirectories]);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() ? !directories.has(entry.name) : !/\.(html|txt|xml|svg|ico|webmanifest)$/.test(entry.name)) continue;
    fs.cpSync(path.join(root, entry.name), path.join(output, entry.name), {
      recursive: true,
      filter: source => {
        const relative = path.relative(root, source).split(path.sep).join('/');
        return relative !== 'img/kleurplaten' && !relative.startsWith('img/kleurplaten/') && !path.basename(source).startsWith('.');
      },
    });
  }
  return output;
}

if (require.main === module) build(path.resolve(__dirname, '..'));
module.exports = { build };
