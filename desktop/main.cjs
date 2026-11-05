const { app, BrowserWindow, dialog } = require('electron');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let frontendServer;
let backendRuntime;
let shuttingDown = false;

function configureEnvironment(userDataPath) {
  const envFile = app.isPackaged
    ? path.join(userDataPath, '.env')
    : path.resolve(__dirname, '../../backend/.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

  const secretsPath = path.join(userDataPath, 'desktop-secrets.json');
  let secrets = {};
  if (fs.existsSync(secretsPath)) {
    secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    if (typeof secrets.jwtSecret !== 'string' || typeof secrets.webhookSecret !== 'string') {
      throw new Error('Desktop secret file is invalid. Remove desktop-secrets.json and restart to regenerate it.');
    }
  } else {
    secrets = {
      jwtSecret: randomBytes(32).toString('hex'),
      webhookSecret: randomBytes(32).toString('hex'),
    };
    fs.writeFileSync(secretsPath, JSON.stringify(secrets), { mode: 0o600 });
  }

  process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? secrets.jwtSecret;
  process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? secrets.webhookSecret;
  process.env.MIN_GAMBLING_AGE = process.env.MIN_GAMBLING_AGE ?? '18';
  process.env.DB_PATH = path.join(userDataPath, 'bettingify.db');
  process.env.PORT = '0';
  process.chdir(userDataPath);
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server.address().port);
    });
  });
}

function createFrontendServer(frontendDist, runtimeConfig) {
  const root = path.resolve(frontendDist);
  const rootPrefix = `${root}${path.sep}`;
  const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };

  return http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    let filePath = path.resolve(root, `.${pathname}`);
    if (filePath !== root && !filePath.startsWith(rootPrefix)) {
      response.writeHead(403).end();
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error && path.extname(pathname)) {
        response.writeHead(404).end();
        return;
      }
      const body = error ? fs.readFileSync(path.join(root, 'index.html')) : content;
      const html = path.basename(filePath) === 'index.html' || error
        ? body.toString('utf8').replace(
          '</head>',
          `<script>window.bettingifyConfig=${JSON.stringify(runtimeConfig).replace(/</g, '\\u003c')};</script></head>`,
        )
        : null;
      const output = html === null ? body : Buffer.from(html);
      response.writeHead(200, {
        'content-type': mimeTypes[path.extname(filePath)] ?? (html ? mimeTypes['.html'] : 'application/octet-stream'),
        'content-length': output.length,
        'x-content-type-options': 'nosniff',
      });
      if (request.method === 'HEAD') response.end(); else response.end(output);
    });
  });
}

async function startDesktopApp() {
  const userDataPath = app.getPath('userData');
  configureEnvironment(userDataPath);

  const frontendDist = app.isPackaged
    ? path.join(process.resourcesPath, 'frontend', 'dist')
    : path.resolve(__dirname, '../dist');
  if (!fs.existsSync(path.join(frontendDist, 'index.html'))) {
    throw new Error('Frontend build is missing. Run npm run desktop:dev or npm run desktop:package.');
  }

  const runtimeConfig = {};
  frontendServer = createFrontendServer(frontendDist, runtimeConfig);
  const frontendPort = await listen(frontendServer);
  const frontendOrigin = `http://127.0.0.1:${frontendPort}`;
  process.env.CORS_ORIGINS = frontendOrigin;

  const backendEntry = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'dist', 'runtime.js')
    : path.resolve(__dirname, '../../backend/dist/runtime.js');
  if (!fs.existsSync(backendEntry)) {
    throw new Error('Backend build is missing. Run npm run desktop:dev or npm run desktop:package.');
  }
  const { startBackendServer } = await import(pathToFileURL(backendEntry).href);
  backendRuntime = await startBackendServer(0, '127.0.0.1');
  const backendAddress = backendRuntime.server.address();
  if (!backendAddress || typeof backendAddress === 'string') throw new Error('Desktop backend did not bind to a TCP port.');

  runtimeConfig.apiUrl = `http://127.0.0.1:${backendAddress.port}/api/v1`;
  runtimeConfig.wsUrl = `ws://127.0.0.1:${backendAddress.port}/ws/aviator`;

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, 'icons', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${frontendOrigin}/`)) event.preventDefault();
  });
  await window.loadURL(frontendOrigin);
}

app.whenReady().then(startDesktopApp).catch((error) => {
  console.error('[bettingify-desktop] startup failed', error);
  dialog.showErrorBox('Bettingify could not start', error.message);
  app.quit();
});

app.on('before-quit', (event) => {
  if (shuttingDown) return;
  shuttingDown = true;
  event.preventDefault();
  const closeFrontend = () => new Promise((resolve) => frontendServer?.close(() => resolve()) ?? resolve());
  Promise.resolve(backendRuntime?.close())
    .then(closeFrontend)
    .catch((error) => console.error('[bettingify-desktop] shutdown failed', error))
    .finally(() => app.quit());
});

app.setAppUserModelId('com.bettingify.desktop');
