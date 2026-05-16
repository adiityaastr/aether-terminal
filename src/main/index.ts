import { app, BrowserWindow, ipcMain, shell, globalShortcut, screen, clipboard, dialog } from 'electron';
import path from 'path';
import log from 'electron-log';
import { setupPtyManager, killAllPtys } from './pty-manager';
import { setupConfigManager, getConfig } from './config-manager';
import { setupSessionManager } from './session-manager';
import { setupSSHManager } from './ssh-manager';
import { setupSFTPManager } from './sftp-manager';
import { setupSerialManager } from './serial-manager';
import { setupTelnetManager } from './telnet-manager';
import { setupPluginSystem } from './plugin-host';
import { initUpdater, checkForUpdates, downloadUpdate, quitAndInstall } from './updater';

log.initialize();
log.info('Aether starting...');

let mainWindow: BrowserWindow | null = null;
let isQuakeVisible = false;

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.on('open-external', (_e, url: string) => shell.openExternal(url));
ipcMain.on('log:error', (_e, msg: string) => log.error('[Renderer]', msg));
ipcMain.handle('clipboard:readText', () => clipboard.readText());
ipcMain.handle('clipboard:writeText', (_e, text: string) => clipboard.writeText(text));
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('dialog:saveFile', async (_e, filename: string) => {
  const result = await dialog.showSaveDialog({ defaultPath: filename });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('window:setOpacity', (_e, opacity: number) => {
  if (mainWindow) mainWindow.setOpacity(Math.max(0.1, Math.min(1, opacity)));
});

ipcMain.handle('window:setAcrylic', (_e, enabled: boolean) => {
  if (mainWindow && process.platform === 'win32') {
    mainWindow.setBackgroundMaterial(enabled ? 'acrylic' : 'none');
  }
});

// Process-level error handlers
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});

setupPtyManager();
setupConfigManager();
setupSessionManager();
setupSSHManager();
setupSFTPManager();
setupSerialManager();
setupTelnetManager();
setupPluginSystem();

function toggleQuakeWindow() {
  if (!mainWindow) return;
  if (isQuakeVisible) {
    mainWindow.hide();
    isQuakeVisible = false;
  } else {
    const display = screen.getPrimaryDisplay();
    const { width } = display.workAreaSize;
    mainWindow.setBounds({ x: 0, y: 0, width, height: Math.round(display.workAreaSize.height * 0.4) });
    mainWindow.setAlwaysOnTop(true);
    mainWindow.show();
    mainWindow.focus();
    isQuakeVisible = true;
  }
}

ipcMain.on('hotkey:toggle', () => toggleQuakeWindow());
ipcMain.handle('hotkey:isQuake', () => isQuakeVisible);

function createWindow() {
  const cfg = getConfig();
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundMaterial: cfg.windowAcrylic && process.platform === 'win32' ? 'acrylic' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (cfg.windowOpacity !== undefined && cfg.windowOpacity !== 1.0) {
    mainWindow.setOpacity(cfg.windowOpacity);
  }

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.on('blur', () => {
    if (isQuakeVisible) {
      mainWindow?.hide();
      isQuakeVisible = false;
    }
  });

  log.info('Main window created');
}

app.whenReady().then(() => {
  createWindow();

  // Register global hotkey for Quake-style toggle
  const hotkey = 'CommandOrControl+`';
  const registered = globalShortcut.register(hotkey, toggleQuakeWindow);
  if (registered) {
    log.info(`Global hotkey registered: ${hotkey}`);
  } else {
    log.warn(`Failed to register global hotkey: ${hotkey}`);
  }

  initUpdater(mainWindow!);

  ipcMain.handle('update:check', () => checkForUpdates());
  ipcMain.handle('update:download', () => downloadUpdate());
  ipcMain.handle('update:install', () => quitAndInstall());

  setTimeout(() => {
    checkForUpdates();
  }, 5000);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  killAllPtys();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
