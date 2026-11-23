import { ZipArchive } from 'archiver';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const sourceExe = path.resolve(`release/electron-builder/Adel-Alfaqih-Accounting-${version}.exe`);
const bundleName = 'Adel-Alfaqih-Offline';
const bundleRoot = path.resolve(`release/${bundleName}`);
await rm(bundleRoot, { recursive: true, force: true });
await mkdir(path.join(bundleRoot, 'data'), { recursive: true });
await mkdir(path.join(bundleRoot, 'assets'), { recursive: true });
await copyFile(sourceExe, path.join(bundleRoot, 'Adel-Alfaqih-Accounting.exe'));
await copyFile('assets/icon.ico', path.join(bundleRoot, 'assets/icon.ico'));
await copyFile('installer-template/adelfaqih.sqlite', path.join(bundleRoot, 'data/adelfaqih.sqlite'));
await writeFile(path.join(bundleRoot, 'اقرأني.txt'), `نظام عادل الفقيه للمحاسبة والمبيعات — تشغيل دون إنترنت\n\n1. شغّل Adel-Alfaqih-Accounting.exe على Windows 10 أو Windows 11 (64-bit).\n2. أنشئ حساب المدير عند أول تشغيل.\n3. قاعدة البيانات المحلية موجودة في مجلد data\\adelfaqih.sqlite؛ احتفظ بنسخة احتياطية منها.\n4. يجب أن يبقى مجلد data بجانب ملف exe. يعمل النظام محلياً على هذا الجهاز ولا يحتاج متصفحاً أو اتصالاً بالإنترنت.\n\nالأيقونة: assets\\icon.ico\nتصميم وبرمجة المهندس معتز البورجي\n`, 'utf8');

const archivePath = path.resolve(`release/${bundleName}-Windows.zip`);
await rm(archivePath, { force: true });
const output = createWriteStream(archivePath);
const archive = new ZipArchive({ zlib: { level: 9 } });
const outputDone = new Promise((resolve, reject) => {
  output.once('close', resolve);
  output.once('error', reject);
  archive.once('error', reject);
});
archive.pipe(output);
archive.directory(bundleRoot, bundleName);
await archive.finalize();
await outputDone;
console.log(`Portable Windows folder: ${bundleRoot}`);
console.log(`Portable Windows archive: ${archivePath}`);
