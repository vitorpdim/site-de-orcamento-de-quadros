// main.js (VERSÃO FINAL COM VERIFICAÇÃO DE ARQUIVO)

const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs'); // Importando o módulo 'fs' para interagir com o sistema de arquivos

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // Mantemos estas configurações que resolvem problemas de segurança e carregamento
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // ##### VERIFICAÇÃO E CARREGAMENTO MAIS ROBUSTO #####

  // 1. Construir o caminho absoluto para o index.html
  const indexPath = path.join(__dirname, 'site-orcamento', 'index.html');

  // 2. Log para vermos o caminho exato que está sendo tentado
  console.log(`[DEBUG] Caminho absoluto construído para o index.html: ${indexPath}`);

  // 3. VERIFICAR SE O ARQUIVO REALMENTE EXISTE NESTE CAMINHO
  if (!fs.existsSync(indexPath)) {
      // Se não existir, mostra uma caixa de erro clara e encerra.
      dialog.showErrorBox(
          'Erro Crítico de Arquivo',
          `O arquivo principal da aplicação (index.html) não foi encontrado.\n\nO sistema procurou em: ${indexPath}\n\nPor favor, verifique se a pasta 'site-orcamento' e o arquivo 'index.html' existem neste local.`
      );
      app.quit();
      return; // Para a execução da função aqui
  }

  // 4. Se o arquivo existe, tenta carregá-lo com loadFile()
  mainWindow.loadFile(indexPath);

  // ######################################################

  // Deixe o DevTools aberto para podermos ver qualquer erro no Console
  mainWindow.webContents.openDevTools();
}

// O try...catch para o servidor continua sendo importante
try {
  console.log('[main.js] Iniciando o servidor backend...');
  require('./backend_orcamento/server.js');
} catch (error) {
  dialog.showErrorBox('Erro Fatal no Backend', `Não foi possível iniciar o servidor.\n\nDetalhes: ${error.message}`);
  app.quit();
}


app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});