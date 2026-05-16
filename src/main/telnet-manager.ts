import net from 'net';
import { ipcMain } from 'electron';
import log from 'electron-log';

interface TelnetSession {
  socket: net.Socket;
}

const sessions = new Map<string, TelnetSession>();
let idCounter = 0;

// Telnet protocol constants
const IAC = 255;
const WILL = 251;
const WONT = 252;
const DO = 253;
const DONT = 254;
const SB = 250;
const SE = 240;
const NAWS = 31;    // Negotiate About Window Size
const TTYPE = 24;   // Terminal Type

function handleTelnetNegotiation(data: Buffer, socket: net.Socket, cols: number, rows: number): Buffer {
  const output: number[] = [];
  let i = 0;

  while (i < data.length) {
    if (data[i] === IAC && i + 2 < data.length) {
      const cmd = data[i + 1];
      const opt = data[i + 2];

      if (cmd === DO) {
        if (opt === TTYPE) {
          // Will send terminal type
          socket.write(Buffer.from([IAC, WILL, TTYPE]));
        } else if (opt === NAWS) {
          // Will negotiate window size
          socket.write(Buffer.from([IAC, WILL, NAWS]));
          // Send window size
          socket.write(Buffer.from([IAC, SB, NAWS, 0, cols, 0, rows, IAC, SE]));
        } else {
          socket.write(Buffer.from([IAC, WONT, opt]));
        }
        i += 3;
      } else if (cmd === WILL) {
        socket.write(Buffer.from([IAC, DO, opt]));
        i += 3;
      } else if (cmd === WONT) {
        socket.write(Buffer.from([IAC, DONT, opt]));
        i += 3;
      } else if (cmd === SB) {
        // Sub-negotiation: find SE
        const seIdx = data.indexOf(SE, i + 3);
        if (seIdx !== -1 && opt === TTYPE) {
          // Respond with terminal type
          const ttype = Buffer.from('xterm-256color');
          const resp = Buffer.from([IAC, SB, TTYPE, 0, ...ttype, IAC, SE]);
          socket.write(resp);
        }
        i = seIdx !== -1 ? seIdx + 1 : i + 3;
      } else {
        i += 2;
      }
    } else {
      output.push(data[i]);
      i++;
    }
  }

  return Buffer.from(output);
}

export function setupTelnetManager() {
  ipcMain.handle('telnet:connect', (event, opts: { host: string; port: number; cols: number; rows: number }) => {
    return new Promise<string>((resolve, reject) => {
      const id = String(++idCounter);
      const socket = new net.Socket();

      socket.setTimeout(10000);

      socket.connect(opts.port, opts.host, () => {
        log.info(`Telnet connected: id=${id}, host=${opts.host}:${opts.port}`);
        sessions.set(id, { socket });
        socket.setTimeout(0);
        resolve(id);
      });

      socket.on('data', (data) => {
        const cleaned = handleTelnetNegotiation(Buffer.from(data), socket, opts.cols, opts.rows);
        if (cleaned.length > 0) {
          event.sender.send(`telnet:data:${id}`, cleaned.toString('binary'));
        }
      });

      socket.on('close', () => {
        event.sender.send(`telnet:exit:${id}`);
        sessions.delete(id);
      });

      socket.on('error', (err) => {
        event.sender.send(`telnet:error:${id}`, err.message);
        sessions.delete(id);
        reject(err.message);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject('Connection timeout');
      });
    });
  });

  ipcMain.on('telnet:input', (_event, id: string, data: string) => {
    sessions.get(id)?.socket.write(data, 'binary');
  });

  ipcMain.on('telnet:disconnect', (_event, id: string) => {
    const session = sessions.get(id);
    if (session) {
      session.socket.destroy();
      sessions.delete(id);
    }
  });
}
