// main.js (VERSÃO FINAL E MAIS COMPATÍVEL)

const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow; // Torna a janela principal uma variável global

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // Estas configurações são essenciais para aplicações locais
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // Necessário para carregar arquivos locais
    },
    icon: path.join(__dirname, 'icon.png') // Opcional, se você tiver um ícone
  });

  // Constrói o caminho para o index.html
  const startUrl = url.format({
    pathname: path.join(__dirname, 'site-orcamento/index.html'),
    protocol: 'file:',
    slashes: true
  });

  mainWindow.loadURL(startUrl);

  // Abre o DevTools apenas se não estiver em produção (instalado)
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Tenta iniciar o servidor backend
try {
  require('./backend_orcamento/server.js');
} catch (error) {
  // Este dialog só funcionará se o app já estiver 'ready'
  // O ideal é logar e mostrar o erro na janela, se possível
  console.error('Erro fatal no backend ao iniciar:', error);
  // Vamos mostrar o erro depois que o app estiver pronto
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