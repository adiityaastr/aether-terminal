import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface Keybinding {
  id: string;
  label: string;
  defaultKey: string; // e.g. "Ctrl+T", "Ctrl+Shift+H"
  key: string;        // current (user-overridden or default)
}

const DEFAULT_BINDINGS: Omit<Keybinding, 'key'>[] = [
  { id: 'tab:new', label: 'New Tab', defaultKey: 'Ctrl+T' },
  { id: 'tab:close', label: 'Close Tab', defaultKey: 'Ctrl+W' },
  { id: 'tab:next', label: 'Next Tab', defaultKey: 'Ctrl+Tab' },
  { id: 'tab:prev', label: 'Previous Tab', defaultKey: 'Ctrl+Shift+Tab' },
  { id: 'pane:splitH', label: 'Split Horizontal', defaultKey: 'Ctrl+Shift+H' },
  { id: 'pane:splitV', label: 'Split Vertical', defaultKey: 'Ctrl+Alt+V' },
  { id: 'pane:close', label: 'Close Pane', defaultKey: 'Ctrl+Shift+W' },
  { id: 'terminal:search', label: 'Find', defaultKey: 'Ctrl+F' },
  { id: 'palette:open', label: 'Command Palette', defaultKey: 'Ctrl+Shift+P' },
  { id: 'terminal:copy', label: 'Copy', defaultKey: 'Ctrl+Shift+C' },
  { id: 'terminal:paste', label: 'Paste', defaultKey: 'Ctrl+Shift+V' },
  { id: 'terminal:zoomIn', label: 'Zoom In', defaultKey: 'Ctrl+=' },
  { id: 'terminal:zoomOut', label: 'Zoom Out', defaultKey: 'Ctrl+-' },
  { id: 'terminal:zoomReset', label: 'Reset Zoom', defaultKey: 'Ctrl+0' },
  { id: 'broadcast:toggle', label: 'Toggle Broadcast', defaultKey: 'Ctrl+Shift+B' },
];

function loadOverrides(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('keybindings') || '{}'); }
  catch { return {}; }
}

function buildBindings(overrides: Record<string, string>): Keybinding[] {
  return DEFAULT_BINDINGS.map((b) => ({ ...b, key: overrides[b.id] || b.defaultKey }));
}

// Parse "Ctrl+Shift+H" into a normalized form for matching
function normalizeCombo(combo: string): string {
  return combo.split('+').map((p) => p.trim().toLowerCase()).sort().join('+');
}

function eventToCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  let key = e.key.toLowerCase();
  if (key === ' ') key = 'space';
  if (key === 'control' || key === 'shift' || key === 'alt' || key === 'meta') return '';
  parts.push(key);
  return parts.sort().join('+');
}

interface KeybindingContextValue {
  bindings: Keybinding[];
  updateBinding: (id: string, newKey: string) => void;
  resetBinding: (id: string) => void;
  resetAll: () => void;
}

const KeybindingContext = createContext<KeybindingContextValue>(null!);
export function useKeybindings() { return useContext(KeybindingContext); }

export function KeybindingProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState(loadOverrides);
  const bindings = buildBindings(overrides);

  useEffect(() => {
    localStorage.setItem('keybindings', JSON.stringify(overrides));
  }, [overrides]);

  const updateBinding = useCallback((id: string, newKey: string) => {
    setOverrides((prev) => ({ ...prev, [id]: newKey }));
  }, []);

  const resetBinding = useCallback((id: string) => {
    setOverrides((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const resetAll = useCallback(() => setOverrides({}), []);

  return (
    <KeybindingContext.Provider value={{ bindings, updateBinding, resetBinding, resetAll }}>
      {children}
    </KeybindingContext.Provider>
  );
}

// Hook: register action handlers and match against keybindings
export function useKeybindingHandler(handlers: Record<string, () => void>) {
  const { bindings } = useKeybindings();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const combo = eventToCombo(e);
      if (!combo) return;
      for (const b of bindings) {
        if (normalizeCombo(b.key) === combo) {
          const fn = handlersRef.current[b.id];
          if (fn) { e.preventDefault(); fn(); }
          return;
        }
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [bindings]);
}

// Utility for recording a new keybinding
export function recordKeybinding(callback: (combo: string) => void): () => void {
  const listener = (e: KeyboardEvent) => {
    e.preventDefault();
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    let key = e.key;
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();
    parts.push(key);
    callback(parts.join('+'));
    cleanup();
  };
  const cleanup = () => window.removeEventListener('keydown', listener);
  window.addEventListener('keydown', listener);
  return cleanup;
}
