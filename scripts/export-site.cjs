const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, '_site');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const name of ['index.html', 'manifest.json', 'covers', 'thumbnails', 'assets']) {
  fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
}
for (const study of JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'))) {
  const destination = path.join(out, 'studies', study.id);
  fs.mkdirSync(destination, { recursive: true });
  const files=study.static ? ['index.html','app.js','style.css','assets'] : ['index.html','app.js'];
  for (const name of files) {
    fs.cpSync(path.join(root, 'studies', study.id, name), path.join(destination, name),{recursive:true});
  }
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
