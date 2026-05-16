import { Client, ClientChannel } from 'ssh2';
import { ipcMain } from 'electron';
import fs from 'fs';
import log from 'electron-log';

interface SSHSession {
  client: Client;
  stream: ClientChannel | null;
}

const sessions = new Map<string, SSHSession>();
let idCounter = 0;

export interface SSHConnectOpts {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  cols: number;
  rows: number;
}

export function setupSSHManager() {
  ipcMain.handle('ssh:connect', (event, opts: SSHConnectOpts) => {
    return new Promise<string>((resolve, reject) => {
      const id = String(++idCounter);
      const client = new Client();

      const authOpts: any = {
        host: opts.host,
        port: opts.port,
        username: opts.username,
        readyTimeout: 10000,
        keepaliveInterval: 30000,
      };

      if (opts.privateKeyPath) {
        try { authOpts.privateKey = fs.readFileSync(opts.privateKeyPath); }
        catch (e) { reject(`Cannot read key: ${opts.privateKeyPath}`); return; }
      } else if (opts.password) {
        authOpts.password = opts.password;
      }

      client.on('ready', () => {
        log.info(`SSH connected: id=${id}, host=${opts.host}`);
        client.shell({ term: 'xterm-256color', cols: opts.cols, rows: opts.rows }, (err, stream) => {
          if (err) { reject(err.message); return; }

          sessions.set(id, { client, stream });

          stream.on('data', (data: Buffer) => {
            event.sender.send(`ssh:data:${id}`, data.toString());
          });

          stream.on('close', () => {
            log.info(`SSH stream closed: id=${id}`);
            event.sender.send(`ssh:exit:${id}`);
            sessions.delete(id);
            client.end();
          });

          resolve(id);
        });
      });

      client.on('error', (err) => {
        log.error(`SSH error: id=${id}`, err.message);
        event.sender.send(`ssh:error:${id}`, err.message);
        sessions.delete(id);
        reject(err.message);
      });

      client.on('close', () => {
        event.sender.send(`ssh:exit:${id}`);
        sessions.delete(id);
      });

      client.connect(authOpts);
    });
  });

  ipcMain.on('ssh:input', (_event, id: string, data: string) => {
    sessions.get(id)?.stream?.write(data);
  });

  ipcMain.on('ssh:resize', (_event, id: string, cols: number, rows: number) => {
    sessions.get(id)?.stream?.setWindow(rows, cols, 0, 0);
  });

  ipcMain.on('ssh:disconnect', (_event, id: string) => {
    const session = sessions.get(id);
    if (session) {
      session.stream?.close();
      session.client.end();
      sessions.delete(id);
    }
  });
}
