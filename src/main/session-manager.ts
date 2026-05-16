import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import type { ConnectionType, ConnectionOpts } from '../common/types';

export interface SessionPane {
  type: 'leaf';
  id: string;
  cwd?: string;
  connectionType?: ConnectionType;
  connectionOptions?: ConnectionOpts;
}

export interface SessionSplit {
  type: 'split';
  direction: 'horizontal' | 'vertical';
  ratio: number;
  children: [SessionNode, SessionNode];
}

export type SessionNode = SessionPane | SessionSplit;

export interface SessionTab {
  id: string;
  title: string;
  paneTree: SessionNode;
  focusedPaneId: string;
}

export interface SessionState {
  tabs: SessionTab[];
  activeTabId: string;
}

const sessionPath = path.join(app.getPath('userData'), 'session.json');

function loadSession(): SessionState | null {
  try {
    if (fs.existsSync(sessionPath)) {
      return JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    }
  } catch (e) {
    log.error('Failed to load session:', e);
  }
  return null;
}

function saveSession(state: SessionState) {
  try {
    fs.writeFileSync(sessionPath, JSON.stringify(state, null, 2));
  } catch (e) {
    log.error('Failed to save session:', e);
  }
}

export function setupSessionManager() {
  ipcMain.handle('session:load', () => loadSession());
  ipcMain.handle('session:save', (_e, state: SessionState) => {
    saveSession(state);
  });
}
