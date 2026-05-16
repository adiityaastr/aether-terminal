import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AppConfig {
  theme: string;
  fontSize: number;
  fontFamily: string;
  defaultProfile: string;
  profiles: any[];
  restoreSession: boolean;
  scrollback: number;
}

interface ConfigContextValue {
  config: AppConfig;
  updateConfig: (partial: Partial<AppConfig>) => Promise<AppConfig>;
  scrollback: number;
  fontSize: number;
  fontFamily: string;
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

  return (
    <ConfigContext.Provider value={{
      config,
      updateConfig,
      scrollback: config.scrollback ?? 10000,
      fontSize: config.fontSize ?? 14,
      fontFamily: config.fontFamily ?? "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
    }}>
      {children}
    </ConfigContext.Provider>
  );
}