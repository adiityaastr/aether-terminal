import { SerialPort } from 'serialport';
import { ipcMain } from 'electron';
import log from 'electron-log';

interface SerialSession {
  port: SerialPort;
}

const sessions = new Map<string, SerialSession>();
let idCounter = 0;

export interface SerialConnectOpts {
  path: string;
  baudRate: number;
  dataBits?: 5 | 6 | 7 | 8;
  parity?: 'none' | 'even' | 'odd';
  stopBits?: 1 | 1.5 | 2;
}

export function setupSerialManager() {
  ipcMain.handle('serial:list', async () => {
    const ports = await SerialPort.list();
    return ports.map((p) => ({ path: p.path, manufacturer: p.manufacturer || '', vendorId: p.vendorId || '' }));
  });

  ipcMain.handle('serial:connect', (event, opts: SerialConnectOpts) => {
    return new Promise<string>((resolve, reject) => {
      const id = String(++idCounter);
      const port = new SerialPort({
        path: opts.path,
        baudRate: opts.baudRate,
        dataBits: opts.dataBits || 8,
        parity: opts.parity || 'none',
        stopBits: opts.stopBits || 1,
        autoOpen: false,
      });

      port.open((err) => {
        if (err) { reject(err.message); return; }
        log.info(`Serial connected: id=${id}, path=${opts.path}, baud=${opts.baudRate}`);
        sessions.set(id, { port });

        port.on('data', (data: Buffer) => {
          event.sender.send(`serial:data:${id}`, data.toString());
        });

        port.on('close', () => {
          event.sender.send(`serial:exit:${id}`);
          sessions.delete(id);
        });

        port.on('error', (err) => {
          event.sender.send(`serial:error:${id}`, err.message);
        });

        resolve(id);
      });
    });
  });

  ipcMain.on('serial:input', (_event, id: string, data: string) => {
    sessions.get(id)?.port.write(data);
  });

  ipcMain.on('serial:disconnect', (_event, id: string) => {
    const session = sessions.get(id);
    if (session) {
      session.port.close();
      sessions.delete(id);
    }
  });
}
