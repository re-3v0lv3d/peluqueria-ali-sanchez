const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
// const isDev = require('electron-is-dev');
const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath);

function createWindow() {
  // Create the browser window.
  const iconPath = path.join(__dirname, 'logo.ico'); // Ruta al icono
  const icon = nativeImage.createFromPath(iconPath);

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Habilita las DevTools solo en desarrollo
      devTools: isDev 
    },
    icon: icon // Establecer el icono de la ventana
  });

  // Load the index.html from a url
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  // Open the DevTools only in development mode.
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(createWindow);

// Quit when all windows are closed.
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