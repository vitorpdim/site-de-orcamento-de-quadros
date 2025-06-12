const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
    icon: path.join(__dirname, 'icon.png')
  });

  const startUrl = url.format({
    pathname: path.join(__dirname, 'site-orcamento/index.html'),
    protocol: 'file:',
    slashes: true
  });

  mainWindow.loadURL(startUrl);
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

try {
  require('./backend_orcamento/server.js');
} catch (error) {
  console.error('Erro fatal no backend ao iniciar:', error);
  app.on('ready', () => {
    dialog.showErrorBox(
      'Erro Fatal no Backend',
      'Não foi possível iniciar o servidor interno.\n\n' +
      'Verifique se o XAMPP/MySQL está rodando corretamente e tente novamente.\n\n' +
      `Detalhes: ${error.message}`
    );
    app.quit();
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
