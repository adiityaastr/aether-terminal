import * as pty from 'node-pty';
import { ipcMain } from 'electron';
import os from 'os';
import fs from 'fs';
import path from 'path';
import log from 'electron-log';

const ptys = new Map<string, pty.IPty>();
let idCounter = 0;

// Command history for autocomplete
const historySet = new Set<string>();
const historyFile = path.join(os.homedir(), '.terminal_op_history');

function loadHistory() {
  try {
    if (fs.existsSync(historyFile)) {
      fs.readFileSync(historyFile, 'utf-8').split('\n').filter(Boolean).forEach((l) => historySet.add(l));
    }
  } catch {}
}

function saveHistory() {
  try {
    const lines = [...historySet].slice(-1000);
    fs.writeFileSync(historyFile, lines.join('\n'));
  } catch {}
}

loadHistory();

function getShell(): string {
  if (process.platform === 'win32') return 'powershell.exe';
  return process.env.SHELL || '/bin/bash';
}

export function setupPtyManager() {
  ipcMain.handle('pty:spawn', (event, cols: number, rows: number) => {
    const id = String(++idCounter);
    const shell = getShell();
    const proc = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: os.homedir(),
      env: process.env as Record<string, string>,
    });

    ptys.set(id, proc);
    log.info(`PTY spawned: id=${id}, shell=${shell}, pid=${proc.pid}`);

    proc.onData((data) => {
      event.sender.send(`pty:data:${id}`, data);
    });

    proc.onExit(({ exitCode }) => {
      log.info(`PTY exited: id=${id}, code=${exitCode}`);
      ptys.delete(id);
      event.sender.send(`pty:exit:${id}`, exitCode);
    });

    return id;
  });

  ipcMain.on('pty:input', (_event, id: string, data: string) => {
    ptys.get(id)?.write(data);
  });

  ipcMain.on('pty:resize', (_event, id: string, cols: number, rows: number) => {
    ptys.get(id)?.resize(cols, rows);
  });

  ipcMain.on('pty:kill', (_event, id: string) => {
    ptys.get(id)?.kill();
    ptys.delete(id);
  });

  // Autocomplete: add command to history
  ipcMain.on('autocomplete:addHistory', (_event, cmd: string) => {
    const trimmed = cmd.trim();
    if (trimmed) {
      historySet.add(trimmed);
      saveHistory();
    }
  });

  // Autocomplete: get suggestions for prefix
  ipcMain.handle('autocomplete:suggest', (_event, prefix: string) => {
    if (!prefix) return [];
    const lower = prefix.toLowerCase();
    const matches: string[] = [];
    for (const cmd of historySet) {
      if (cmd.toLowerCase().startsWith(lower) && cmd !== prefix) {
        matches.push(cmd);
        if (matches.length >= 8) break;
      }
    }
    return matches;
  });

  // Autocomplete: path completion
  ipcMain.handle('autocomplete:paths', (_event, partial: string, cwd: string) => {
    try {
      const dir = partial.includes('/') || partial.includes('\\')
        ? path.resolve(cwd, path.dirname(partial))
        : cwd;
      const base = path.basename(partial).toLowerCase();
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries
        .filter((e) => e.name.toLowerCase().startsWith(base))
        .slice(0, 10)
        .map((e) => ({ name: e.name, isDir: e.isDirectory() }));
    } catch {
      return [];
    }
  });
}

export function killAllPtys() {
  ptys.forEach((p) => p.kill());
  ptys.clear();
}
