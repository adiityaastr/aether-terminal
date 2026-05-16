import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  main: string;
  activationEvents?: string[];
}

export interface PluginInfo {
  id: string;
  manifest: PluginManifest;
  enabled: boolean;
  path: string;
}

interface LoadedPlugin {
  info: PluginInfo;
  module: any;
  active: boolean;
}

const pluginsDir = path.join(app.getPath('userData'), 'plugins');
const plugins = new Map<string, LoadedPlugin>();

function ensurePluginsDir() {
  fs.mkdirSync(pluginsDir, { recursive: true });
}

function discoverPlugins(): PluginInfo[] {
  ensurePluginsDir();
  const results: PluginInfo[] = [];
  try {
    const dirs = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      const manifestPath = path.join(pluginsDir, dir.name, 'package.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        if (manifest.aether) {
          results.push({
            id: dir.name,
            manifest: manifest.aether,
            enabled: true,
            path: path.join(pluginsDir, dir.name),
          });
        }
      } catch {}
    }
  } catch {}
  return results;
}

function loadPlugin(info: PluginInfo): LoadedPlugin | null {
  try {
    const mainPath = path.join(info.path, info.manifest.main);
    const mod = require(mainPath);
    return { info, module: mod, active: false };
  } catch (e: any) {
    log.error(`Failed to load plugin ${info.id}:`, e.message);
    return null;
  }
}

function activatePlugin(plugin: LoadedPlugin, api: PluginAPI) {
  try {
    if (plugin.module.activate) {
      plugin.module.activate(api);
      plugin.active = true;
      log.info(`Plugin activated: ${plugin.info.id}`);
    }
  } catch (e: any) {
    log.error(`Failed to activate plugin ${plugin.info.id}:`, e.message);
  }
}

function deactivatePlugin(plugin: LoadedPlugin) {
  try {
    if (plugin.module.deactivate) {
      plugin.module.deactivate();
    }
    plugin.active = false;
  } catch {}
}

// Plugin API exposed to plugins
export interface PluginAPI {
  registerCommand: (id: string, label: string, handler: () => void) => void;
  getConfig: () => any;
  log: (msg: string) => void;
}

const registeredCommands = new Map<string, { label: string; handler: () => void }>();

function createPluginAPI(pluginId: string): PluginAPI {
  return {
    registerCommand: (id, label, handler) => {
      registeredCommands.set(`${pluginId}:${id}`, { label, handler });
    },
    getConfig: () => ({}),
    log: (msg) => log.info(`[Plugin:${pluginId}]`, msg),
  };
}

export function setupPluginSystem() {
  ipcMain.handle('plugins:list', () => {
    return discoverPlugins();
  });

  ipcMain.handle('plugins:loadAll', () => {
    const discovered = discoverPlugins();
    for (const info of discovered) {
      if (plugins.has(info.id)) continue;
      const loaded = loadPlugin(info);
      if (loaded) {
        plugins.set(info.id, loaded);
        const api = createPluginAPI(info.id);
        activatePlugin(loaded, api);
      }
    }
    return [...plugins.values()].map((p) => ({ id: p.info.id, name: p.info.manifest.name, active: p.active }));
  });

  ipcMain.handle('plugins:enable', (_e, id: string) => {
    const plugin = plugins.get(id);
    if (plugin && !plugin.active) {
      activatePlugin(plugin, createPluginAPI(id));
    }
  });

  ipcMain.handle('plugins:disable', (_e, id: string) => {
    const plugin = plugins.get(id);
    if (plugin && plugin.active) {
      deactivatePlugin(plugin);
    }
  });

  ipcMain.handle('plugins:getCommands', () => {
    return [...registeredCommands.entries()].map(([id, { label }]) => ({ id, label }));
  });

  ipcMain.handle('plugins:execCommand', (_e, id: string) => {
    registeredCommands.get(id)?.handler();
  });

  // Load all plugins on startup
  const discovered = discoverPlugins();
  for (const info of discovered) {
    const loaded = loadPlugin(info);
    if (loaded) {
      plugins.set(info.id, loaded);
      activatePlugin(loaded, createPluginAPI(info.id));
    }
  }

  log.info(`Plugin system initialized. ${plugins.size} plugin(s) loaded.`);
}
