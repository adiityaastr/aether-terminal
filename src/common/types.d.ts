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

export type ConnectionType = 'local' | 'ssh' | 'serial' | 'telnet';

export interface SSHConnectOpts {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  cols: number;
  rows: number;
}

export interface SerialConnectOpts {
  path: string;
  baudRate: number;
  dataBits?: 5 | 6 | 7 | 8;
  parity?: 'none' | 'even' | 'odd';
  stopBits?: 1 | 1.5 | 2;
}

export interface TelnetConnectOpts {
  host: string;
  port: number;
  cols: number;
  rows: number;
}

export type ConnectionOpts = SSHConnectOpts | SerialConnectOpts | TelnetConnectOpts;

export interface PaneConnection {
  type: ConnectionType;
  sessionId?: string;
  opts?: ConnectionOpts;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ToastMessage {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  autoDismiss?: number;
}
