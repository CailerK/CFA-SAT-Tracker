const fs = require('fs');
const path = require('path');
const postcss = require(path.join(__dirname, 'node_modules', 'postcss'));
const cssnano = require(path.join(__dirname, 'node_modules', 'cssnano'));

function walk(dir, list = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, list);
    else if (p.endsWith('.css')) list.push(p);
  }
  return list;
}

(async () => {
  const files = walk(path.resolve(__dirname, 'src'));
  let bad = 0;
  for (const file of files) {
    const css = fs.readFileSync(file, 'utf8');
    try {
      await postcss([cssnano]).process(css, { from: file });
    } catch (e) {
      bad++;
      console.log(`BROKEN: ${path.relative(__dirname, file)}`);
      console.log(`  ${(e.message || '').split('\n').slice(0, 3).join(' | ')}`);
    }
  }
  console.log(`\nDone — ${bad} file(s) broken.`);
})();
