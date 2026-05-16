export {};

declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, ...args: unknown[]) => void;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      platform: string;
    };
  }
}

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
