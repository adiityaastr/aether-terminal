import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const sub = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  platform: process.platform,
});
