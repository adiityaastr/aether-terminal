import { Client, SFTPWrapper } from 'ssh2';
import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import log from 'electron-log';

interface SFTPSession {
  client: Client;
  sftp: SFTPWrapper;
}

const sessions = new Map<string, SFTPSession>();
let idCounter = 0;

export function setupSFTPManager() {
  ipcMain.handle('sftp:connect', (_event, opts: { host: string; port: number; username: string; password?: string; privateKeyPath?: string }) => {
    return new Promise<string>((resolve, reject) => {
      const id = String(++idCounter);
      const client = new Client();
      const authOpts: any = {
        host: opts.host,
        port: opts.port,
        username: opts.username,
        readyTimeout: 10000,
      };
      if (opts.privateKeyPath) {
        try { authOpts.privateKey = fs.readFileSync(opts.privateKeyPath); }
        catch { reject('Cannot read key file'); return; }
      } else if (opts.password) {
        authOpts.password = opts.password;
      }

      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) { reject(err.message); return; }
          sessions.set(id, { client, sftp });
          log.info(`SFTP connected: id=${id}, host=${opts.host}`);
          resolve(id);
        });
      });
      client.on('error', (err) => reject(err.message));
      client.connect(authOpts);
    });
  });

  ipcMain.handle('sftp:list', (_event, id: string, remotePath: string) => {
    return new Promise((resolve, reject) => {
      const session = sessions.get(id);
      if (!session) { reject('No session'); return; }
      session.sftp.readdir(remotePath, (err, list) => {
        if (err) { reject(err.message); return; }
        resolve(list.map((item) => ({
          name: item.filename,
          size: item.attrs.size,
          isDir: (item.attrs.mode! & 0o40000) !== 0,
          modified: item.attrs.mtime,
          permissions: item.attrs.mode,
        })));
      });
    });
  });

  ipcMain.handle('sftp:download', (event, id: string, remotePath: string, localPath: string) => {
    return new Promise<void>((resolve, reject) => {
      const session = sessions.get(id);
      if (!session) { reject('No session'); return; }
      const readStream = session.sftp.createReadStream(remotePath);
      const writeStream = fs.createWriteStream(localPath);
      let transferred = 0;

      readStream.on('data', (chunk: Buffer) => {
        transferred += chunk.length;
        event.sender.send(`sftp:progress:${id}`, { remotePath, transferred });
      });
      readStream.pipe(writeStream);
      writeStream.on('finish', () => resolve());
      readStream.on('error', (err: Error) => reject(err.message));
      writeStream.on('error', (err: Error) => reject(err.message));
    });
  });

  ipcMain.handle('sftp:upload', (event, id: string, localPath: string, remotePath: string) => {
    return new Promise<void>((resolve, reject) => {
      const session = sessions.get(id);
      if (!session) { reject('No session'); return; }
      const readStream = fs.createReadStream(localPath);
      const writeStream = session.sftp.createWriteStream(remotePath);
      let transferred = 0;

      readStream.on('data', (chunk: Buffer) => {
        transferred += chunk.length;
        event.sender.send(`sftp:progress:${id}`, { remotePath, transferred });
      });
      readStream.pipe(writeStream);
      writeStream.on('finish', () => resolve());
      readStream.on('error', (err: Error) => reject(err.message));
      writeStream.on('error', (err: Error) => reject(err.message));
    });
  });

  ipcMain.handle('sftp:mkdir', (_event, id: string, remotePath: string) => {
    return new Promise<void>((resolve, reject) => {
      const session = sessions.get(id);
      if (!session) { reject('No session'); return; }
      session.sftp.mkdir(remotePath, (err) => {
        if (err) reject(err.message); else resolve();
      });
    });
  });

  ipcMain.handle('sftp:delete', (_event, id: string, remotePath: string) => {
    return new Promise<void>((resolve, reject) => {
      const session = sessions.get(id);
      if (!session) { reject('No session'); return; }
      session.sftp.unlink(remotePath, (err) => {
        if (err) reject(err.message); else resolve();
      });
    });
  });

  ipcMain.handle('sftp:rmdir', (_event, id: string, remotePath: string) => {
    return new Promise<void>((resolve, reject) => {
      const session = sessions.get(id);
      if (!session) { reject('No session'); return; }
      session.sftp.rmdir(remotePath, (err) => {
        if (err) reject(err.message); else resolve();
      });
    });
  });

  ipcMain.handle('sftp:rename', (_event, id: string, oldPath: string, newPath: string) => {
    return new Promise<void>((resolve, reject) => {
      const session = sessions.get(id);
      if (!session) { reject('No session'); return; }
      session.sftp.rename(oldPath, newPath, (err) => {
        if (err) reject(err.message); else resolve();
      });
    });
  });

  ipcMain.handle('sftp:stat', (_event, id: string, remotePath: string) => {
    return new Promise((resolve, reject) => {
      const session = sessions.get(id);
      if (!session) { reject('No session'); return; }
      session.sftp.stat(remotePath, (err, stats) => {
        if (err) reject(err.message);
        else resolve({ size: stats.size, isDir: stats.isDirectory(), modified: stats.mtime });
      });
    });
  });

  ipcMain.on('sftp:disconnect', (_event, id: string) => {
    const session = sessions.get(id);
    if (session) {
      session.client.end();
      sessions.delete(id);
    }
  });
}
