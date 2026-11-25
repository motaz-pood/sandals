import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'release/Adel-Alfaqih-Offline');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(full));
    else found.push(full);
  }
  return found;
}
const files = await walk(root);
const find = name => files.find(file => path.basename(file).toLowerCase() === name.toLowerCase());
const executable = find('Adel-Alfaqih-Accounting.exe');
const icon = find('icon.ico');
const png = find('icon.png');
const database = find('adelfaqih.sqlite');
const readme = files.find(file => /اقرأني\.txt|readme\.txt/i.test(path.basename(file)));
for (const [label, file] of [['Windows EXE', executable], ['ICO icon', icon], ['PNG icon', png], ['SQLite database', database], ['instructions', readme]]) {
  if (!file) throw new Error(`Missing ${label} in portable folder: ${root}`);
  const info = await stat(file);
  if (info.size === 0) throw new Error(`${label} is empty: ${file}`);
  if (label === 'Windows EXE' && info.size < 20_000_000) throw new Error('Windows EXE is unexpectedly small.');
  if (label === 'SQLite database' && info.size < 10_000) throw new Error('SQLite template is unexpectedly small.');
  console.log(`${label}: ${info.size.toLocaleString()} bytes`);
}
if ((await stat(icon)).size < 10000) throw new Error('ICO is unexpectedly small; build may have produced an empty or invalid icon.');
const iconBytes = await readFile(icon);
const iconHeader = iconBytes.readUInt16LE(2);
const iconCount = iconBytes.readUInt16LE(4);
if (iconBytes.readUInt16LE(0) !== 0 || iconHeader !== 1 || iconCount < 4) throw new Error('ICO file header is invalid or lacks multiple resolutions.');
const db = new DatabaseSync(database, { readOnly: true });
const integrity = db.prepare('PRAGMA integrity_check').get();
if (integrity.integrity_check !== 'ok') throw new Error('SQLite database integrity check failed.');
if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n !== 0) throw new Error('Portable template should not contain user accounts.');
db.close();
console.log(`Verified portable folder: ${root}`);
