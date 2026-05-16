import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

autoUpdater.autoDownload = false;
autoUpdater.logger = log;

export function initUpdater(mainWindow: BrowserWindow) {
  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('update:status', 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:status', 'available', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update:status', 'not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:progress', progress.percent);
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:status', 'downloaded');
  });

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update:status', 'error', err.message);
  });
}

export function checkForUpdates() {
  autoUpdater.checkForUpdates();
}

export function downloadUpdate() {
  autoUpdater.downloadUpdate();
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall();
}