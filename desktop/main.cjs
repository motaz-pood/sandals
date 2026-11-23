const { app, BrowserWindow, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

let apiServer;

async function startDesktop() {
  app.setAppUserModelId('com.motaz.alfaqih.accounting');
  const portableFolder = process.env.PORTABLE_EXECUTABLE_DIR;
  const dataRoot = portableFolder || app.getPath('userData');
  const dataDirectory = path.join(dataRoot, 'data');
  fs.mkdirSync(dataDirectory, { recursive: true });

  process.env.NODE_ENV = 'production';
  process.env.API_HOST = '127.0.0.1';
  process.env.API_PORT = '0';
  process.env.DB_FILE = path.join(dataDirectory, 'adelfaqih.sqlite');
  process.env.APP_DIST = path.join(app.getAppPath(), 'dist');

  const backend = await import(pathToFileURL(path.join(__dirname, 'server.mjs')).href);
  apiServer = backend.httpServer;
  if (!apiServer.listening) {
    await new Promise((resolve, reject) => {
      apiServer.once('listening', resolve);
      apiServer.once('error', reject);
    });
  }
  const address = apiServer.address();
  const origin = `http://127.0.0.1:${address.port}`;

  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 800,
    minHeight: 620,
    show: false,
    backgroundColor: '#f6f8fb',
    title: 'عادل الفقيه للمحاسبة والمبيعات',
    icon: path.join(app.getAppPath(), 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin)) event.preventDefault();
  });
  window.once('ready-to-show', () => window.show());
  await window.loadURL(origin);
  if (process.env.ALFAQIH_DEVTOOLS === '1') window.webContents.openDevTools();
}

app.whenReady().then(startDesktop).catch(error => {
  console.error(error);
  dialog.showErrorBox('تعذر تشغيل نظام عادل الفقيه', `${error.message}\n\nتأكد من وجود ملفات التطبيق وقاعدة البيانات.`);
  app.quit();
});

app.on('before-quit', () => {
  if (apiServer?.listening) apiServer.close();
});

app.on('window-all-closed', () => app.quit());
