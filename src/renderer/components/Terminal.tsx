import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useTheme } from '../ThemeContext';
import SearchBar from './SearchBar';
import '@xterm/xterm/css/xterm.css';

export default function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: theme.font?.size || 14,
      fontFamily: theme.font?.family || "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
      theme: theme.terminal,
    });

    const fit = new FitAddon();
    const search = new SearchAddon();
    const webLinks = new WebLinksAddon((_event, uri) => {
      window.electronAPI.send('open-external', uri);
    });

    xterm.loadAddon(fit);
    xterm.loadAddon(search);
    xterm.loadAddon(webLinks);
    xterm.open(container);
    fit.fit();

    xtermRef.current = xterm;
    fitRef.current = fit;
    searchRef.current = search;

    // Ctrl+F to toggle search
    xterm.attachCustomKeyEventHandler((e) => {
      if (e.ctrlKey && e.key === 'f' && e.type === 'keydown') {
        setShowSearch(true);
        return false;
      }
      if (e.ctrlKey && e.key === 'l' && e.type === 'keydown') {
        xterm.clear();
        return false;
      }
      return true;
    });

    // Spawn PTY
    window.electronAPI.invoke('pty:spawn', xterm.cols, xterm.rows).then((id) => {
      ptyIdRef.current = id as string;

      const unsub = window.electronAPI.on(`pty:data:${id}`, (data: unknown) => {
        xterm.write(data as string);
      });

      xterm.onData((data) => {
        window.electronAPI.send('pty:input', id, data);
      });

      window.electronAPI.on(`pty:exit:${id}`, () => {
        xterm.write('\r\n\x1b[90m[Process exited]\x1b[0m\r\n');
      });

      (xterm as any)._unsub = unsub;
    });

    // Listen for clear command from toolbar
    const clearHandler = () => xterm.clear();
    window.addEventListener('terminal:clear', clearHandler);

    // Resize
    const onResize = () => {
      fit.fit();
      if (ptyIdRef.current) {
        window.electronAPI.send('pty:resize', ptyIdRef.current, xterm.cols, xterm.rows);
      }
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('terminal:clear', clearHandler);
      if (ptyIdRef.current) window.electronAPI.send('pty:kill', ptyIdRef.current);
      (xterm as any)._unsub?.();
      xterm.dispose();
    };
  }, []);

  return (
    <div className="terminal-wrapper">
      <SearchBar
        searchAddon={searchRef.current}
        visible={showSearch}
        onClose={() => setShowSearch(false)}
      />
      <div ref={containerRef} className="terminal-container" />
    </div>
  );
}
