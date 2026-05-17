import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AppConfig {
  theme: string;
  fontSize: number;
  fontFamily: string;
  defaultProfile: string;
  profiles: any[];
  restoreSession: boolean;
  scrollback: number;
  gpuRenderer: boolean;
  windowOpacity: number;
  windowAcrylic: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  copyOnSelect: boolean;
  rightClickBehavior: 'contextMenu' | 'paste';
  wordSeparator: string;
  fontLigatures: boolean;
  lineHeight: number;
  letterSpacing: number;
  terminalPadding: number;
  bellStyle: 'none' | 'visual' | 'audible' | 'both';
}

interface ConfigContextValue {
  config: AppConfig;
  updateConfig: (partial: Partial<AppConfig>) => Promise<AppConfig>;
  scrollback: number;
  fontSize: number;
  fontFamily: string;
  gpuRenderer: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  copyOnSelect: boolean;
  rightClickBehavior: 'contextMenu' | 'paste';
  wordSeparator: string;
  fontLigatures: boolean;
  lineHeight: number;
  letterSpacing: number;
  terminalPadding: number;
  bellStyle: 'none' | 'visual' | 'audible' | 'both';
}

const ConfigContext = createContext<ConfigContextValue>(null!);
export function useConfig() { return useContext(ConfigContext); }

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>({
    theme: 'catppuccin',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
    defaultProfile: 'default',
    profiles: [{ id: 'default', name: 'Default', type: 'local' }],
    restoreSession: true,
    scrollback: 10000,
    gpuRenderer: true,
    windowOpacity: 1.0,
    windowAcrylic: false,
    cursorStyle: 'block',
    cursorBlink: true,
    copyOnSelect: false,
    rightClickBehavior: 'contextMenu',
    wordSeparator: " ()[]{}'\"，:;~!@#$%^&*|+=?<>",
    fontLigatures: false,
    lineHeight: 1.0,
    letterSpacing: 0,
    terminalPadding: 4,
    bellStyle: 'none',
  });

  useEffect(() => {
    window.electronAPI.invoke('config:get').then((c: unknown) => {
      if (c) setConfig(c as AppConfig);
    });
  }, []);

  const updateConfig = useCallback(async (partial: Partial<AppConfig>) => {
    const result = await window.electronAPI.invoke('config:set', partial) as AppConfig;
    setConfig(result);
    return result;
  }, []);

  useEffect(() => {
    window.electronAPI.invoke('window:setOpacity', config.windowOpacity ?? 1);
  }, [config.windowOpacity]);

  useEffect(() => {
    window.electronAPI.invoke('window:setAcrylic', config.windowAcrylic ?? false);
  }, [config.windowAcrylic]);

  return (
    <ConfigContext.Provider value={{
      config,
      updateConfig,
      scrollback: config.scrollback ?? 10000,
      fontSize: config.fontSize ?? 14,
      fontFamily: config.fontFamily ?? "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
      gpuRenderer: config.gpuRenderer ?? true,
      cursorStyle: config.cursorStyle ?? 'block',
      cursorBlink: config.cursorBlink ?? true,
      copyOnSelect: config.copyOnSelect ?? false,
      rightClickBehavior: config.rightClickBehavior ?? 'contextMenu',
      wordSeparator: config.wordSeparator ?? " ()[]{}'\"，:;~!@#$%^&*|+=?<>",
      fontLigatures: config.fontLigatures ?? false,
      lineHeight: config.lineHeight ?? 1.0,
      letterSpacing: config.letterSpacing ?? 0,
      terminalPadding: config.terminalPadding ?? 4,
      bellStyle: config.bellStyle ?? 'none',
    }}>
      {children}
    </ConfigContext.Provider>
  );
}