const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'MazI GameChat',
    autoHideMenuBar: true,
    backgroundColor: '#080c14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      allowRunningInsecureContent: true,
    },
  });

  Menu.setApplicationMenu(null);

  win.loadURL('https://mazi.mozzone.ir');

  win.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'allow' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
