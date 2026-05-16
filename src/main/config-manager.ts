import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';

export interface Profile {
  id: string;
  name: string;
  type: 'local' | 'ssh' | 'serial' | 'telnet';
  shell?: string;
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  sshKeyPath?: string;
  serialPort?: string;
  serialBaud?: number;
  telnetHost?: string;
  telnetPort?: number;
}

export interface AppConfig {
  theme: string;
  fontSize: number;
  fontFamily: string;
  defaultProfile: string;
  profiles: Profile[];
  restoreSession: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  theme: 'catppuccin',
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
  defaultProfile: 'default',
  profiles: [{ id: 'default', name: 'Default', type: 'local' }],
  restoreSession: true,
};

const configDir = path.join(app.getPath('userData'));
const configPath = path.join(configDir, 'config.json');

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...data };
    }
  } catch (e) {
    log.error('Failed to load config:', e);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: AppConfig) {
  try {
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    log.error('Failed to save config:', e);
  }
}

let config = loadConfig();

export function setupConfigManager() {
  ipcMain.handle('config:get', () => config);

  ipcMain.handle('config:set', (_e, partial: Partial<AppConfig>) => {
    config = { ...config, ...partial };
    saveConfig(config);
    return config;
  });

  ipcMain.handle('config:getProfiles', () => config.profiles);

  ipcMain.handle('config:saveProfile', (_e, profile: Profile) => {
    const idx = config.profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) config.profiles[idx] = profile;
    else config.profiles.push(profile);
    saveConfig(config);
    return config.profiles;
  });

  ipcMain.handle('config:deleteProfile', (_e, id: string) => {
    config.profiles = config.profiles.filter((p) => p.id !== id);
    saveConfig(config);
    return config.profiles;
  });

  // Profile sync: export all settings as JSON
  ipcMain.handle('config:export', () => {
    return JSON.stringify(config, null, 2);
  });

  // Profile sync: import settings from JSON string
  ipcMain.handle('config:import', (_e, jsonStr: string) => {
    try {
      const imported = JSON.parse(jsonStr);
      config = { ...DEFAULT_CONFIG, ...imported };
      saveConfig(config);
      return config;
    } catch (e: any) {
      throw new Error('Invalid config JSON');
    }
  });
}

export function getConfig() { return config; }
