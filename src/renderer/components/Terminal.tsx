import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { useTheme } from '../ThemeContext';
import { useConfig } from '../ConfigContext';
import i18n from '../i18n';
import SearchBar from './SearchBar';
import TerminalContextMenu from './TerminalContextMenu';
import ConnectionOverlay from './ConnectionOverlay';
import AutocompleteDropdown from './AutocompleteDropdown';
import type { ConnectionType, ConnectionOpts, ConnectionState } from '../../common/types';
import '@xterm/xterm/css/xterm.css';

export interface TerminalHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  clear: () => void;
}

interface TerminalProps {
  paneId?: string;
  connectionType?: ConnectionType;
  connectionOptions?: ConnectionOpts;
  onConnectionStateChange?: (state: ConnectionState, sessionId?: string) => void;
  onSplitH?: () => void;
  onSplitV?: () => void;
  onClosePane?: () => void;
  reconnectKey?: number;
  broadcasting?: boolean;
  onCwdChange?: (cwd: string) => void;
}

const Terminal = forwardRef<TerminalHandle, TerminalProps>(({
  paneId,
  connectionType = 'local',
  connectionOptions,
  onConnectionStateChange,
  onSplitH,
  onSplitV,
  onClosePane,
  reconnectKey = 0,
  broadcasting = false,
  onCwdChange,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const { theme } = useTheme();
  const {
    scrollback, fontSize: configFontSize, updateConfig, gpuRenderer,
    cursorStyle, cursorBlink, copyOnSelect, rightClickBehavior,
    wordSeparator, fontLigatures, lineHeight, letterSpacing,
    terminalPadding, bellStyle,
  } = useConfig();
  const [fontSize, setFontSize] = useState(configFontSize);
  const [autocompleteVisible, setAutocompleteVisible] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [autocompletePosition, setAutocompletePosition] = useState({ x: 0, y: 0 });
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendInputRef = useRef<((data: string) => void) | null>(null);
  const autocompleteVisibleRef = useRef(false);
  const autocompleteSuggestionsRef = useRef<string[]>([]);
  const autocompleteIndexRef = useRef(0);

  autocompleteVisibleRef.current = autocompleteVisible;
  autocompleteSuggestionsRef.current = autocompleteSuggestions;
  autocompleteIndexRef.current = autocompleteIndex;

  const confirmMultiLinePaste = (text: string): boolean => {
    if (!/\r|\n/.test(text)) return true;
    const lines = text.split(/\r?\n/);
    const preview = lines.slice(0, 5).join('\n');
    const suffix = lines.length > 5 ? '\n...' : '';
    return window.confirm(`${i18n.t('pasteWarning')}\n\n${preview}${suffix}\n\n${i18n.t('pasteWarningDetail')}`);
  };

  const triggerAutocomplete = useCallback((term: XTerm) => {
    if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);
    autocompleteTimerRef.current = setTimeout(() => {
      const buffer = term.buffer.active;
      const line = buffer.getLine(buffer.cursorY);
      if (!line) { setAutocompleteVisible(false); return; }
      const text = line.translateToString(true, 0, buffer.cursorX);
      const match = text.match(/(\S+)$/);
      if (!match || match[1].length < 2) { setAutocompleteVisible(false); return; }
      window.electronAPI.invoke('autocomplete:suggest', match[1]).then((results: unknown) => {
        const suggestions = results as string[];
        if (suggestions.length > 0) {
          setAutocompleteSuggestions(suggestions);
          setAutocompleteIndex(0);
          setAutocompleteVisible(true);
          const cellWidth = (term.element?.querySelector('.xterm-rows') as HTMLElement)?.offsetWidth || term.cols * 9;
          const rowHeight = parseInt(getComputedStyle(term.element?.querySelector('.xterm-rows') as HTMLElement).lineHeight) || 20;
          const colWidth = cellWidth / term.cols;
          setAutocompletePosition({
            x: buffer.cursorX * colWidth,
            y: (buffer.cursorY + 1) * rowHeight + 30,
          });
        } else {
          setAutocompleteVisible(false);
        }
      });
    }, 300);
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      setFontSize((s) => {
        const next = Math.min(s + 1, 72);
        updateConfig({ fontSize: next });
        return next;
      });
    },
    zoomOut: () => {
      setFontSize((s) => {
        const next = Math.max(s - 1, 6);
        updateConfig({ fontSize: next });
        return next;
      });
    },
    resetZoom: () => {
      const def = 14;
      setFontSize(def);
      updateConfig({ fontSize: def });
    },
    clear: () => xtermRef.current?.clear(),
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    mountedRef.current = true;
    setConnectionState('connecting');

    const xterm = new XTerm({
      cursorBlink: cursorBlink ?? true,
      cursorStyle: cursorStyle ?? 'block',
      fontSize,
      fontFamily: theme.font?.family || "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
      scrollback: scrollback ?? 10000,
      theme: theme.terminal,
      lineHeight: lineHeight ?? 1.0,
      letterSpacing: letterSpacing ?? 0,
      wordSeparator: wordSeparator ?? " ()[]{}'\"，:;~!@#$%^&*|+=?<>",
    });

    const fit = new FitAddon();
    const search = new SearchAddon();
    const webLinks = new WebLinksAddon((_event, uri) => {
      window.electronAPI.send('open-external', uri);
    });

    try {
      xterm.loadAddon(fit);
      xterm.loadAddon(search);
      xterm.loadAddon(webLinks);
      xterm.open(container);
    } catch (e) {
      console.error('Failed to initialize terminal:', e);
      xterm.dispose();
      xtermRef.current = null;
      return () => { mountedRef.current = false; };
    }
    if (gpuRenderer !== false) {
      try {
        const webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => { webglAddon.dispose(); });
        xterm.loadAddon(webglAddon);
      } catch {}
    }
    try {
      fit.fit();
    } catch {}

    xtermRef.current = xterm;
    fitRef.current = fit;
    searchRef.current = search;

    const sendInput = (data: string) => {
      const id = sessionIdRef.current;
      if (!id) return;
      if (connectionType === 'local') window.electronAPI.send('pty:input', id, data);
      else if (connectionType === 'ssh') window.electronAPI.send('ssh:input', id, data);
      else if (connectionType === 'serial') window.electronAPI.send('serial:input', id, data);
      else if (connectionType === 'telnet') window.electronAPI.send('telnet:input', id, data);
    };
    sendInputRef.current = sendInput;

    let hasSelection = false;
    xterm.onSelectionChange(() => {
      const selection = xterm.getSelection();
      if (selection && selection.length > 0 && !hasSelection && copyOnSelect) {
        window.electronAPI.invoke('clipboard:writeText', selection);
      }
      hasSelection = !!selection && selection.length > 0;
    });

    xterm.onBell(() => {
      if (bellStyle === 'none') return;
      if (bellStyle === 'visual' || bellStyle === 'both') {
        container.classList.add('terminal-bell-flash');
        setTimeout(() => container.classList.remove('terminal-bell-flash'), 300);
      }
      if (bellStyle === 'audible' || bellStyle === 'both') {
        window.electronAPI.invoke('bell:play');
      }
    });

    xterm.attachCustomKeyEventHandler((e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C' && e.type === 'keydown') {
        const sel = xterm.getSelection();
        if (sel) window.electronAPI.invoke('clipboard:writeText', sel);
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'V' && e.type === 'keydown') {
        window.electronAPI.invoke('clipboard:readText').then((text: unknown) => {
          if (typeof text === 'string' && text && id && confirmMultiLinePaste(text)) sendInput(text);
        });
        return false;
      }
      if (e.ctrlKey && e.key === 'f' && e.type === 'keydown') {
        setShowSearch(true);
        return false;
      }
      if (e.ctrlKey && e.key === 'l' && e.type === 'keydown') {
        xterm.clear();
        return false;
      }
      if (e.ctrlKey && e.key === '=' && e.type === 'keydown') {
        setFontSize((s) => { const n = Math.min(s + 1, 72); updateConfig({ fontSize: n }); return n; });
        return false;
      }
      if (e.ctrlKey && e.key === '-' && e.type === 'keydown') {
        setFontSize((s) => { const n = Math.max(s - 1, 6); updateConfig({ fontSize: n }); return n; });
        return false;
      }
      if (e.ctrlKey && e.key === '0' && e.type === 'keydown') {
        const def = 14;
        setFontSize(def);
        updateConfig({ fontSize: def });
        return false;
      }
      return true;
    });

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (rightClickBehavior === 'paste') {
        window.electronAPI.invoke('clipboard:readText').then((text: unknown) => {
          if (typeof text === 'string' && text && confirmMultiLinePaste(text)) {
            sendInputRef.current?.(text);
          }
        });
        return;
      }
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    };
    container.addEventListener('contextmenu', handleContextMenu);

    const handlePasteEvent = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text');
      if (!text) return;
      if (/\r|\n/.test(text)) {
        e.preventDefault();
        e.stopPropagation();
        if (confirmMultiLinePaste(text)) sendInput(text);
      }
    };
    container.addEventListener('paste', handlePasteEvent, true);

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const filePath = (files[i] as any).path as string | undefined;
        if (filePath) {
          paths.push(filePath.includes(' ') ? `"${filePath}"` : filePath);
        }
      }
      if (paths.length > 0) {
        sendInputRef.current?.(paths.join(' ') + '\r');
      }
    };
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    const handleAutocompleteKeyDown = (e: KeyboardEvent) => {
      if (!autocompleteVisibleRef.current) return;
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const selected = autocompleteSuggestionsRef.current[autocompleteIndexRef.current];
        if (selected) {
          const buffer = xterm.buffer.active;
          const line = buffer.getLine(buffer.cursorY);
          if (line) {
            const text = line.translateToString(true, 0, buffer.cursorX);
            const match = text.match(/(\S+)$/);
            if (match) {
              const completion = selected.slice(match[1].length);
              sendInputRef.current?.(completion + (e.key === 'Enter' ? '\r' : ' '));
            }
          }
        }
        setAutocompleteVisible(false);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAutocompleteVisible(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex((i) => Math.min(i + 1, autocompleteSuggestionsRef.current.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex((i) => Math.max(i - 1, 0));
        return;
      }
    };
    container.addEventListener('keydown', handleAutocompleteKeyDown, true);

    let id: string | null = null;

    const processData = (raw: string): string => {
      const osc7Match = raw.match(/\x1b\]7;([^\x07\x1b]*)\x1b\\/);
      if (osc7Match) {
        try {
          const url = osc7Match[1];
          const parsed = new URL(url);
          const path = decodeURIComponent(parsed.pathname);
          if (path) {
            onCwdChange?.(path);
          }
        } catch {}
        raw = raw.replace(/\x1b\]7;[^\x07\x1b]*\x1b\\/g, '');
      }
      return raw;
    };

    const connectLocal = async () => {
      id = await window.electronAPI.invoke('pty:spawn', xterm.cols, xterm.rows, (connectionOptions as import('../../common/types').LocalConnectOpts)?.shell) as string;
      sessionIdRef.current = id;
      if (!mountedRef.current) return;
      setConnectionState('connected');
      onConnectionStateChange?.('connected', id);

      window.electronAPI.on(`pty:data:${id}`, (data: unknown) => { xterm.write(processData(data as string)); });
      xterm.onData((data) => {
        sendInput(data);
        if (broadcasting && paneId) {
          window.dispatchEvent(new CustomEvent('terminal:broadcast-send', { detail: { sourcePaneId: paneId, data } }));
        }
        if (data === '\r') {
          const line = xterm.buffer.active.getLine(xterm.buffer.active.cursorY)?.translateToString(true).trim();
          if (line) window.electronAPI.send('autocomplete:addHistory', line);
          setAutocompleteVisible(false);
        } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
          triggerAutocomplete(xterm);
        }
      });
      window.electronAPI.on(`pty:exit:${id}`, () => {
        xterm.write('\r\n\x1b[90m[Process exited]\x1b[0m\r\n');
        if (!mountedRef.current) return;
        setConnectionState('disconnected');
        onConnectionStateChange?.('disconnected', id!);
      });
    };

    const connectSSH = async () => {
      const opts = connectionOptions as import('../../common/types').SSHConnectOpts;
      id = await window.electronAPI.invoke('ssh:connect', opts) as string;
      sessionIdRef.current = id;
      if (!mountedRef.current) return;
      setConnectionState('connected');
      onConnectionStateChange?.('connected', id);

      window.electronAPI.on(`ssh:data:${id}`, (data: unknown) => { xterm.write(processData(data as string)); });
      xterm.onData((data) => {
        sendInput(data);
        if (broadcasting && paneId) {
          window.dispatchEvent(new CustomEvent('terminal:broadcast-send', { detail: { sourcePaneId: paneId, data } }));
        }
        if (data === '\r') {
          const line = xterm.buffer.active.getLine(xterm.buffer.active.cursorY)?.translateToString(true).trim();
          if (line) window.electronAPI.send('autocomplete:addHistory', line);
          setAutocompleteVisible(false);
        } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
          triggerAutocomplete(xterm);
        }
      });
      window.electronAPI.on(`ssh:exit:${id}`, () => {
        xterm.write('\r\n\x1b[90m[SSH session ended]\x1b[0m\r\n');
        if (!mountedRef.current) return;
        setConnectionState('disconnected');
        onConnectionStateChange?.('disconnected', id!);
      });
      window.electronAPI.on(`ssh:error:${id}`, (errMsg: unknown) => {
        xterm.write(`\r\n\x1b[31m[Error: ${errMsg}]\x1b[0m\r\n`);
        if (!mountedRef.current) return;
        setConnectionState('error');
        onConnectionStateChange?.('error', id!);
      });
    };

    const connectSerial = async () => {
      const opts = connectionOptions as import('../../common/types').SerialConnectOpts;
      id = await window.electronAPI.invoke('serial:connect', opts) as string;
      sessionIdRef.current = id;
      if (!mountedRef.current) return;
      setConnectionState('connected');
      onConnectionStateChange?.('connected', id);

      window.electronAPI.on(`serial:data:${id}`, (data: unknown) => { xterm.write(processData(data as string)); });
      xterm.onData((data) => {
        sendInput(data);
        if (broadcasting && paneId) {
          window.dispatchEvent(new CustomEvent('terminal:broadcast-send', { detail: { sourcePaneId: paneId, data } }));
        }
        if (data === '\r') {
          const line = xterm.buffer.active.getLine(xterm.buffer.active.cursorY)?.translateToString(true).trim();
          if (line) window.electronAPI.send('autocomplete:addHistory', line);
          setAutocompleteVisible(false);
        } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
          triggerAutocomplete(xterm);
        }
      });
      window.electronAPI.on(`serial:exit:${id}`, () => {
        xterm.write('\r\n\x1b[90m[Serial disconnected]\x1b[0m\r\n');
        if (!mountedRef.current) return;
        setConnectionState('disconnected');
        onConnectionStateChange?.('disconnected', id!);
      });
      window.electronAPI.on(`serial:error:${id}`, (errMsg: unknown) => {
        xterm.write(`\r\n\x1b[31m[Error: ${errMsg}]\x1b[0m\r\n`);
        if (!mountedRef.current) return;
        setConnectionState('error');
        onConnectionStateChange?.('error', id!);
      });
    };

    const connectTelnet = async () => {
      const opts = connectionOptions as import('../../common/types').TelnetConnectOpts;
      id = await window.electronAPI.invoke('telnet:connect', opts) as string;
      sessionIdRef.current = id;
      if (!mountedRef.current) return;
      setConnectionState('connected');
      onConnectionStateChange?.('connected', id);

      window.electronAPI.on(`telnet:data:${id}`, (data: unknown) => { xterm.write(processData(data as string)); });
      xterm.onData((data) => {
        sendInput(data);
        if (broadcasting && paneId) {
          window.dispatchEvent(new CustomEvent('terminal:broadcast-send', { detail: { sourcePaneId: paneId, data } }));
        }
        if (data === '\r') {
          const line = xterm.buffer.active.getLine(xterm.buffer.active.cursorY)?.translateToString(true).trim();
          if (line) window.electronAPI.send('autocomplete:addHistory', line);
          setAutocompleteVisible(false);
        } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
          triggerAutocomplete(xterm);
        }
      });
      window.electronAPI.on(`telnet:exit:${id}`, () => {
        xterm.write('\r\n\x1b[90m[Telnet session ended]\x1b[0m\r\n');
        if (!mountedRef.current) return;
        setConnectionState('disconnected');
        onConnectionStateChange?.('disconnected', id!);
      });
      window.electronAPI.on(`telnet:error:${id}`, (errMsg: unknown) => {
        xterm.write(`\r\n\x1b[31m[Error: ${errMsg}]\x1b[0m\r\n`);
        if (!mountedRef.current) return;
        setConnectionState('error');
        onConnectionStateChange?.('error', id!);
      });
    };

    const doConnect = () => {
      if (connectionType === 'local') { connectLocal().catch((err) => { if (!mountedRef.current) return; xterm.write(`\r\n\x1b[31m[Connection failed: ${err}]\x1b[0m\r\n`); setConnectionState('error'); onConnectionStateChange?.('error'); }); }
      else if (connectionType === 'ssh') { connectSSH().catch((err) => { if (!mountedRef.current) return; xterm.write(`\r\n\x1b[31m[Connection failed: ${err}]\x1b[0m\r\n`); setConnectionState('error'); onConnectionStateChange?.('error'); }); }
      else if (connectionType === 'serial') { connectSerial().catch((err) => { if (!mountedRef.current) return; xterm.write(`\r\n\x1b[31m[Connection failed: ${err}]\x1b[0m\r\n`); setConnectionState('error'); onConnectionStateChange?.('error'); }); }
      else if (connectionType === 'telnet') { connectTelnet().catch((err) => { if (!mountedRef.current) return; xterm.write(`\r\n\x1b[31m[Connection failed: ${err}]\x1b[0m\r\n`); setConnectionState('error'); onConnectionStateChange?.('error'); }); }
    };

    onConnectionStateChange?.('connecting');
    doConnect();

    const clearHandler = () => xterm.clear();
    window.addEventListener('terminal:clear', clearHandler);

    const broadcastRecvHandler = (e: Event) => {
      const { targetPaneId, data } = (e as CustomEvent).detail;
      if (targetPaneId === paneId && data) {
        const id = sessionIdRef.current;
        if (!id) return;
        if (connectionType === 'local') window.electronAPI.send('pty:input', id, data);
        else if (connectionType === 'ssh') window.electronAPI.send('ssh:input', id, data);
        else if (connectionType === 'serial') window.electronAPI.send('serial:input', id, data);
        else if (connectionType === 'telnet') window.electronAPI.send('telnet:input', id, data);
      }
    };
    window.addEventListener('terminal:broadcast-recv', broadcastRecvHandler);

    const exportBufferHandler = () => {
      const xtermInst = xtermRef.current;
      if (!xtermInst) return;
      const buffer = xtermInst.buffer.active;
      const lines: string[] = [];
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) lines.push(line.translateToString(true));
      }
      const content = lines.join('\n');
      window.electronAPI.invoke('buffer:export', content, `terminal-export-${Date.now()}.txt`);
    };
    window.addEventListener('terminal:exportBuffer', exportBufferHandler);

    const onResize = () => {
      if (!mountedRef.current) return;
      try {
        fit.fit();
      } catch {}
      const currentId = sessionIdRef.current;
      if (currentId) {
        if (connectionType === 'local') window.electronAPI.send('pty:resize', currentId, xterm.cols, xterm.rows);
        else if (connectionType === 'ssh') window.electronAPI.send('ssh:resize', currentId, xterm.cols, xterm.rows);
      }
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      mountedRef.current = false;
      resizeObserver.disconnect();
      window.removeEventListener('terminal:clear', clearHandler);
      window.removeEventListener('terminal:broadcast-recv', broadcastRecvHandler);
      window.removeEventListener('terminal:exportBuffer', exportBufferHandler);
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('paste', handlePasteEvent, true);
      container.removeEventListener('keydown', handleAutocompleteKeyDown, true);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
      const currentId = sessionIdRef.current;
      if (currentId) {
        if (connectionType === 'local') window.electronAPI.send('pty:kill', currentId);
        else if (connectionType === 'ssh') window.electronAPI.send('ssh:disconnect', currentId);
        else if (connectionType === 'serial') window.electronAPI.send('serial:disconnect', currentId);
        else if (connectionType === 'telnet') window.electronAPI.send('telnet:disconnect', currentId);
      }
      xterm.dispose();
      xtermRef.current = null;
      fitRef.current = null;
      searchRef.current = null;
      sessionIdRef.current = null;
    };
  }, [reconnectKey]);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
    }
  }, [fontSize]);

  useEffect(() => {
    const xterm = xtermRef.current;
    if (!xterm) return;
    xterm.options.cursorStyle = cursorStyle ?? 'block';
    xterm.options.cursorBlink = cursorBlink ?? true;
    xterm.options.lineHeight = lineHeight ?? 1.0;
    xterm.options.letterSpacing = letterSpacing ?? 0;
  }, [cursorStyle, cursorBlink, lineHeight, letterSpacing]);

  return (
    <div className={`terminal-wrapper${broadcasting ? ' broadcasting' : ''}`} style={{ position: 'relative' }}>
      <SearchBar
        searchAddon={searchRef.current}
        visible={showSearch}
        onClose={() => setShowSearch(false)}
      />
      <div ref={containerRef} className="terminal-container" style={{ padding: `${terminalPadding ?? 4}px` }} />
      <AutocompleteDropdown
        suggestions={autocompleteSuggestions}
        selectedIndex={autocompleteIndex}
        visible={autocompleteVisible}
        position={autocompletePosition}
        onSelect={(suggestion) => {
          const buffer = xtermRef.current?.buffer.active;
          if (!buffer) return;
          const line = buffer.getLine(buffer.cursorY);
          if (line) {
            const text = line.translateToString(true, 0, buffer.cursorX);
            const match = text.match(/(\S+)$/);
            if (match) {
              const completion = suggestion.slice(match[1].length);
              sendInputRef.current?.(completion + ' ');
            }
          }
          setAutocompleteVisible(false);
        }}
        onDismiss={() => setAutocompleteVisible(false)}
      />
      {connectionState !== 'connecting' && connectionState !== 'connected' && (
        <ConnectionOverlay
          connectionType={connectionType}
          connectionState={connectionState}
          onReconnect={() => {
            setConnectionState('connecting');
            onConnectionStateChange?.('connecting');
          }}
          onClose={onClosePane ?? (() => {})}
        />
      )}
      {showContextMenu && (
        <TerminalContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setShowContextMenu(false)}
          onCopy={() => {
            const text = xtermRef.current?.getSelection();
            if (text) window.electronAPI.invoke('clipboard:writeText', text);
          }}
          onPaste={() => {
            const id = sessionIdRef.current;
            window.electronAPI.invoke('clipboard:readText').then((text: unknown) => {
              if (typeof text === 'string' && text && id && confirmMultiLinePaste(text)) {
                if (connectionType === 'local') window.electronAPI.send('pty:input', id, text);
                else if (connectionType === 'ssh') window.electronAPI.send('ssh:input', id, text);
                else if (connectionType === 'serial') window.electronAPI.send('serial:input', id, text);
                else if (connectionType === 'telnet') window.electronAPI.send('telnet:input', id, text);
              }
            });
          }}
          onSelectAll={() => xtermRef.current?.selectAll()}
          onClear={() => xtermRef.current?.clear()}
          onSearch={() => setShowSearch(true)}
          onZoomIn={() => setFontSize((s) => { const n = Math.min(s + 1, 72); updateConfig({ fontSize: n }); return n; })}
          onZoomOut={() => setFontSize((s) => { const n = Math.max(s - 1, 6); updateConfig({ fontSize: n }); return n; })}
          onResetZoom={() => { setFontSize(14); updateConfig({ fontSize: 14 }); }}
          onSplitH={onSplitH}
          onSplitV={onSplitV}
        />
      )}
    </div>
  );
});

export default Terminal;