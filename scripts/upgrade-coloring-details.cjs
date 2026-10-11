const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { upgradeDetail, isCurrentDetail } = require('../lib/coloring-detail-upgrade.cjs');

const root = path.resolve(__dirname, '..');
const argumentsList = process.argv.slice(2);
const requestedSlugs = new Set(argumentsList.filter(argument => argument.startsWith('--slug=')).map(argument => argument.slice(7)));
const outputArgument = argumentsList.find(argument => argument.startsWith('--out='));
const reportArgument = argumentsList.find(argument => argument.startsWith('--report='));
const limitArgument = argumentsList.find(argument => argument.startsWith('--limit='));
const limit = limitArgument ? Number(limitArgument.slice(8)) : Infinity;
const checkOnly = argumentsList.includes('--check');
if (!(limit > 0) || (checkOnly && outputArgument)) throw new Error('Invalid limit or conflicting output/check options');
if (argumentsList.some(argument => !/^(--check|--(?:slug|out|report|limit)=.+)$/.test(argument))) throw new Error('Unknown upgrade option');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8') + '\nthis.colorings = COLORINGS;', context);
const colorings = context.colorings;
for (const slug of requestedSlugs) {
  if (!colorings.some(page => page.slug === slug)) throw new Error(`Unknown coloring slug: ${slug}`);
}
const changes = [];
const current = [];
for (const page of colorings) {
  if (requestedSlugs.size && !requestedSlugs.has(page.slug)) continue;
  const relative = `kleurplaat/${page.slug}/index.html`;
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) throw new Error(`Missing existing detail page: ${page.slug}`);
  const html = fs.readFileSync(source, 'utf8');
  if (isCurrentDetail(html, page)) {
    current.push(relative);
    continue;
  }
  if (changes.length >= limit) continue;
  changes.push({path: relative, html: upgradeDetail(html, page), slug: page.slug});
}
if (outputArgument) {
  const destination = path.resolve(outputArgument.slice(6));
  for (const change of changes) {
    const filename = path.join(destination, change.path);
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    fs.writeFileSync(filename, change.html, 'utf8');
  }
}
const report = {current: current.length, upgrades: changes.length, written: Boolean(outputArgument), paths: changes.map(change => change.path)};
if (reportArgument) {
  const filename = path.resolve(reportArgument.slice(9));
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
if (checkOnly && changes.length) process.exitCode = 1;
