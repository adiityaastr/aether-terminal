# UX & Productivity Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill all UX gaps for a Developer/DevOps terminal — CWD tracking, copy-on-select, cursor config, drag-drop files, word separators, right-click behavior, font ligatures, line height/letter spacing, terminal padding, bell handling, output export, keybinding reassignment UI, and disconnected tab badges.

**Architecture:** Layered approach — Config Infrastructure first (extend AppConfig + Settings Panel), then Core UX features (Terminal.tsx changes), then Power UX (output export, keybinding UI, tab badges). All changes are in existing files.

**Tech Stack:** Electron, React, TypeScript, xterm.js

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/common/types.d.ts` | AppConfig interface with new fields |
| `src/main/config-manager.ts` | Default values for new config fields |
| `src/main/index.ts` | `bell:play` and `buffer:export` IPC handlers |
| `src/renderer/ConfigContext.tsx` | Expose new config fields to components |
| `src/renderer/components/SettingsPanel.tsx` | Restructured settings UI with sections |
| `src/renderer/components/Terminal.tsx` | Core UX features (copy-on-select, cursor, drag-drop, word separator, right-click, bell, CWD) |
| `src/renderer/App.tsx` | CWD tracking state, connection state badges for TabBar, buffer export command |
| `src/renderer/components/TabBar.tsx` | Connection state badge rendering |
| `src/renderer/components/StatusBar.tsx` | Wire CWD display |
| `src/renderer/KeybindingContext.tsx` | Expose `updateBinding` more visibly for Settings UI |
| `src/renderer/locales/en.json` | New i18n keys |
| `src/renderer/locales/id.json` | New i18n keys |
| `src/renderer/styles/global.css` | Bell flash animation, tab badge, settings section styles |

---

### Task 1: Extend AppConfig with New Fields

**Files:**
- Modify: `src/common/types.d.ts:29-36`
- Modify: `src/main/config-manager.ts:21-45`
- Modify: `src/renderer/ConfigContext.tsx:3-40`

- [ ] **Step 1: Add new fields to types.d.ts AppConfig**

Replace the `AppConfig` interface in `src/common/types.d.ts`:

```typescript
export interface AppConfig {
  theme: string;
  fontSize: number;
  fontFamily: string;
  defaultProfile: string;
  profiles: Profile[];
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
```

- [ ] **Step 2: Add defaults to config-manager.ts**

Add the new fields to `DEFAULT_CONFIG` in `src/main/config-manager.ts`:

```typescript
const DEFAULT_CONFIG: AppConfig = {
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
};
```

Also add `cursorStyle`, `cursorBlink`, `copyOnSelect`, `rightClickBehavior`, `wordSeparator`, `fontLigatures`, `lineHeight`, `letterSpacing`, `terminalPadding`, `bellStyle` to the `AppConfig` interface at the top of `config-manager.ts`.

- [ ] **Step 3: Update ConfigContext.tsx — add new fields to interface and defaults**

Update the `AppConfig` interface and `ConfigContextValue` in `src/renderer/ConfigContext.tsx`:

```typescript
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
```

Update the `useState` default to include new fields:

```typescript
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
```

Update the Provider value to expose all new fields:

```typescript
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
```

- [ ] **Step 4: Verify build compiles**

Run: `cd D:\terminal_op && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/common/types.d.ts src/main/config-manager.ts src/renderer/ConfigContext.tsx
git commit -m "feat: extend AppConfig with cursor, selection, typography, bell, and padding fields"
```

---

### Task 2: Restructure Settings Panel

**Files:**
- Modify: `src/renderer/components/SettingsPanel.tsx`
- Modify: `src/renderer/locales/en.json`
- Modify: `src/renderer/locales/id.json`
- Modify: `src/renderer/styles/global.css`

- [ ] **Step 1: Add i18n keys for new settings**

Add to `src/renderer/locales/en.json` inside `"settings"`:

```json
"cursorStyle": "Cursor Style",
"cursorBlink": "Cursor Blink",
"copyOnSelect": "Copy on Select",
"wordSeparator": "Word Separators",
"rightClickBehavior": "Right-Click Behavior",
"fontLigatures": "Font Ligatures",
"lineHeight": "Line Height",
"letterSpacing": "Letter Spacing",
"terminalPadding": "Terminal Padding",
"bellStyle": "Bell Style",
"editKeybinding": "Edit",
"resetKeybinding": "Reset",
"recordingKeybinding": "Press keys...",
"sectionAppearance": "Appearance",
"sectionTerminal": "Terminal",
"sectionCursor": "Cursor",
"sectionSelection": "Selection",
"sectionBell": "Bell"
```

Add corresponding translations to `src/renderer/locales/id.json` inside `"settings"`:

```json
"cursorStyle": "Gaya Kursor",
"cursorBlink": "Kursor Berkedip",
"copyOnSelect": "Salin saat Pilih",
"wordSeparator": "Pemisah Kata",
"rightClickBehavior": "Perilaku Klik Kanan",
"fontLigatures": "Ligatur Font",
"lineHeight": "Tinggi Baris",
"letterSpacing": "Jarak Huruf",
"terminalPadding": "Padding Terminal",
"bellStyle": "Gaya Bel",
"editKeybinding": "Ubah",
"resetKeybinding": "Reset",
"recordingKeybinding": "Tekan tombol...",
"sectionAppearance": "Tampilan",
"sectionTerminal": "Terminal",
"sectionCursor": "Kursor",
"sectionSelection": "Pemilihan",
"sectionBell": "Bel"
```

- [ ] **Step 2: Add CSS for settings sections and keybinding editing**

Add to `src/renderer/styles/global.css`:

```css
/* Settings Sections */
.settings-section { margin-bottom: 20px; }
.settings-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.4; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid var(--border); }
.settings-section .setting-group { margin-bottom: 12px; }

/* Keybinding editing */
.keybinding-edit-btn {
  background: transparent; border: 1px solid var(--border); color: var(--text);
  padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;
}
.keybinding-edit-btn:hover { background: rgba(255,255,255,0.06); }
.keybinding-recording kbd { animation: keybinding-flash 0.8s infinite; }
@keyframes keybinding-flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* Tab badges */
.tab-badge {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  margin-right: 6px; flex-shrink: 0;
}
.tab-badge-error { background: var(--red); }
.tab-badge-disconnected { background: #888; }
.tab-badge-connecting { background: var(--accent); animation: keybinding-flash 1s infinite; }

/* Bell flash */
.terminal-bell-flash { animation: bell-flash 0.3s ease-out; }
@keyframes bell-flash { 0% { filter: brightness(1.8); } 100% { filter: brightness(1); } }
```

- [ ] **Step 3: Rewrite SettingsPanel with sections and all new controls**

Replace `src/renderer/components/SettingsPanel.tsx` with the restructured version that includes:
- **Appearance section**: Theme, Language, Window Opacity, Window Acrylic, GPU Renderer
- **Terminal section**: Font Family (text input), Font Size (number), Scrollback, Line Height (range slider 0.8-2.0 step 0.1), Letter Spacing (range slider -5 to 20 step 1), Font Ligatures (checkbox), Terminal Padding (range slider 0-24 step 1)
- **Cursor section**: Cursor Style (select: block/underline/bar), Cursor Blink (checkbox)
- **Selection section**: Copy on Select (checkbox), Word Separators (text input), Right-Click Behavior (select: contextMenu/paste)
- **Bell section**: Bell Style (select: none/visual/audible/both)
- **Profiles section**: Manage Profiles button
- **Keybindings section**: List with Edit/Reset buttons, recording mode

The keybinding section now supports clicking "Edit" to enter recording mode using `recordKeybinding` from `KeybindingContext.tsx`, and "Reset" restores the default.

Full component code:

```tsx
import React, { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { useKeybindings, recordKeybinding } from '../KeybindingContext';
import { useConfig } from '../ConfigContext';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenProfiles: () => void;
}

export default function SettingsPanel({ visible, onClose, onOpenProfiles }: Props) {
  const { themeId, setThemeId, availableThemes } = useTheme();
  const { bindings, resetBinding, updateBinding } = useKeybindings();
  const config = useConfig();
  const { updateConfig } = config;
  const { t, i18n } = useTranslation();
  const [recordingId, setRecordingId] = useState<string | null>(null);

  if (!visible) return null;

  const startRecording = (id: string) => {
    setRecordingId(id);
    const cleanup = recordKeybinding((combo: string) => {
      updateBinding(id, combo);
      setRecordingId(null);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('settings.title')}</h2>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="modal-body">
          <div className="settings-section">
            <div className="settings-section-title">{t('settings.sectionAppearance')}</div>
            <div className="setting-group">
              <label>{t('settings.theme')}</label>
              <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
                {availableThemes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="setting-group">
              <label>{t('settings.language')}</label>
              <select value={i18n.language} onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('language', e.target.value); }}>
                <option value="en">English</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
            </div>
            <div className="setting-group">
              <label>{t('settings.windowOpacity')}</label>
              <input
                type="range" min="10" max="100" step="5"
                value={Math.round((config.config.windowOpacity ?? 1) * 100)}
                onChange={(e) => updateConfig({ windowOpacity: parseInt(e.target.value) / 100 })}
                style={{ width: '100%' }}
              />
              <span>{Math.round((config.config.windowOpacity ?? 1) * 100)}%</span>
            </div>
            <div className="setting-group">
              <label>{t('settings.windowAcrylic')}</label>
              <input
                type="checkbox"
                checked={config.config.windowAcrylic ?? false}
                onChange={() => updateConfig({ windowAcrylic: !(config.config.windowAcrylic ?? false) })}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.gpuRenderer')}</label>
              <input
                type="checkbox"
                checked={config.gpuRenderer !== false}
                onChange={() => updateConfig({ gpuRenderer: !config.gpuRenderer })}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.sectionTerminal')}</div>
            <div className="setting-group">
              <label>{t('settings.fontFamily')}</label>
              <input
                type="text"
                value={config.config.fontFamily ?? "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace"}
                onChange={(e) => updateConfig({ fontFamily: e.target.value })}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.fontSize')}</label>
              <input
                type="number"
                value={config.fontSize}
                min={6} max={72}
                onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) || 14 })}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.scrollback')}</label>
              <input
                type="number"
                value={config.scrollback}
                min={1000} max={100000} step={1000}
                onChange={(e) => updateConfig({ scrollback: parseInt(e.target.value) || 10000 })}
              />
              <input
                type="range" value={config.scrollback}
                min={1000} max={100000} step={1000}
                onChange={(e) => updateConfig({ scrollback: parseInt(e.target.value) })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.lineHeight')}</label>
              <input
                type="range" min="0.8" max="2.0" step="0.1"
                value={config.lineHeight}
                onChange={(e) => updateConfig({ lineHeight: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span>{config.lineHeight.toFixed(1)}</span>
            </div>
            <div className="setting-group">
              <label>{t('settings.letterSpacing')}</label>
              <input
                type="range" min="-5" max="20" step="1"
                value={config.letterSpacing}
                onChange={(e) => updateConfig({ letterSpacing: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span>{config.letterSpacing}px</span>
            </div>
            <div className="setting-group">
              <label>{t('settings.fontLigatures')}</label>
              <input
                type="checkbox"
                checked={config.fontLigatures}
                onChange={() => updateConfig({ fontLigatures: !config.fontLigatures })}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.terminalPadding')}</label>
              <input
                type="range" min="0" max="24" step="1"
                value={config.terminalPadding}
                onChange={(e) => updateConfig({ terminalPadding: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span>{config.terminalPadding}px</span>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.sectionCursor')}</div>
            <div className="setting-group">
              <label>{t('settings.cursorStyle')}</label>
              <select
                value={config.cursorStyle}
                onChange={(e) => updateConfig({ cursorStyle: e.target.value as 'block' | 'underline' | 'bar' })}
              >
                <option value="block">Block</option>
                <option value="underline">Underline</option>
                <option value="bar">Bar</option>
              </select>
            </div>
            <div className="setting-group">
              <label>{t('settings.cursorBlink')}</label>
              <input
                type="checkbox"
                checked={config.cursorBlink}
                onChange={() => updateConfig({ cursorBlink: !config.cursorBlink })}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.sectionSelection')}</div>
            <div className="setting-group">
              <label>{t('settings.copyOnSelect')}</label>
              <input
                type="checkbox"
                checked={config.copyOnSelect}
                onChange={() => updateConfig({ copyOnSelect: !config.copyOnSelect })}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.rightClickBehavior')}</label>
              <select
                value={config.rightClickBehavior}
                onChange={(e) => updateConfig({ rightClickBehavior: e.target.value as 'contextMenu' | 'paste' })}
              >
                <option value="contextMenu">{t('contextMenu', 'Context Menu')}</option>
                <option value="paste">{t('paste', 'Paste')}</option>
              </select>
            </div>
            <div className="setting-group">
              <label>{t('settings.wordSeparator')}</label>
              <input
                type="text"
                value={config.wordSeparator}
                onChange={(e) => updateConfig({ wordSeparator: e.target.value })}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.sectionBell')}</div>
            <div className="setting-group">
              <label>{t('settings.bellStyle')}</label>
              <select
                value={config.bellStyle}
                onChange={(e) => updateConfig({ bellStyle: e.target.value as 'none' | 'visual' | 'audible' | 'both' })}
              >
                <option value="none">None</option>
                <option value="visual">Visual</option>
                <option value="audible">Audible</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.profiles')}</div>
            <div className="setting-group">
              <button className="btn-secondary" onClick={() => { onOpenProfiles(); onClose(); }}>
                {t('settings.profiles')}
              </button>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Keybindings</div>
            <div className="keybinding-list">
              {bindings.map((b) => (
                <div key={b.id} className="keybinding-row">
                  <span>{b.label}</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {recordingId === b.id ? (
                      <kbd className="keybinding-recording">{t('settings.recordingKeybinding')}</kbd>
                    ) : (
                      <kbd>{b.key}</kbd>
                    )}
                    <button
                      className="keybinding-edit-btn"
                      onClick={() => startRecording(b.id)}
                      disabled={recordingId !== null}
                    >
                      {t('settings.editKeybinding')}
                    </button>
                    <button
                      className="keybinding-edit-btn"
                      onClick={() => resetBinding(b.id)}
                    >
                      {t('settings.resetKeybinding')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build compiles**

Run: `cd D:\terminal_op && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/SettingsPanel.tsx src/renderer/locales/en.json src/renderer/locales/id.json src/renderer/styles/global.css
git commit -m "feat: restructured settings panel with cursor, selection, terminal, and bell sections"
```

---

### Task 3: Core UX Features in Terminal.tsx

**Files:**
- Modify: `src/renderer/components/Terminal.tsx`

This is the biggest task. All changes go into Terminal.tsx — adding copy-on-select, cursor style, drag-drop file path, word separator, right-click behavior config, font ligatures, line height, letter spacing, padding, bell handling, and CWD tracking.

- [ ] **Step 1: Update Terminal.tsx — add config destructuring and props**

At the top of the Terminal component, update the `useConfig()` destructuring to include all new fields:

```typescript
const {
  scrollback, fontSize: configFontSize, updateConfig, gpuRenderer,
  cursorStyle, cursorBlink, copyOnSelect, rightClickBehavior,
  wordSeparator, fontLigatures, lineHeight, letterSpacing,
  terminalPadding, bellStyle,
} = useConfig();
```

Add `onCwdChange` prop to `TerminalProps`:

```typescript
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
```

Add `onCwdChange` to destructured props.

- [ ] **Step 2: Update xterm constructor to include new options**

In the `useEffect` that creates the xterm instance, update `new XTerm({...})`:

```typescript
const xterm = new XTerm({
  cursorBlink: cursorBlink ?? true,
  cursorStyle: cursorStyle ?? 'block',
  fontSize,
  fontFamily: theme.font?.family || "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
  scrollback: scrollback ?? 10000,
  theme: theme.terminal,
  lineHeight: lineHeight ?? 1.0,
  letterSpacing: letterSpacing ?? 0,
  fontLigatures: fontLigatures ?? false,
  wordSeparator: wordSeparator ?? " ()[]{}'\"，:;~!@#$%^&*|+=?<>",
});
```

- [ ] **Step 3: Add copy-on-select handler**

After xterm initialization and before the data handler, add the selection change listener:

```typescript
let hasSelection = false;
xterm.onSelectionChange(() => {
  const selection = xterm.getSelection();
  if (selection && selection.length > 0 && !hasSelection && copyOnSelect) {
    window.electronAPI.invoke('clipboard:writeText', selection);
  }
  hasSelection = !!selection && selection.length > 0;
});
```

- [ ] **Step 4: Add bell handler**

After the selection handler, add bell handling:

```typescript
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
```

- [ ] **Step 5: Add drag-and-drop file path handler**

After the contextmenu handler, add:

```typescript
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
    const file = files[i];
    if (file.path) {
      paths.push(file.path.includes(' ') ? `"${file.path}"` : file.path);
    }
  }
  if (paths.length > 0) {
    sendInput(paths.join(' ') + '\r');
  }
};
container.addEventListener('dragover', handleDragOver);
container.addEventListener('drop', handleDrop);
```

And in the cleanup function, add:

```typescript
container.removeEventListener('dragover', handleDragOver);
container.removeEventListener('drop', handleDrop);
```

- [ ] **Step 6: Modify contextmenu handler for right-click behavior config**

Replace the contextmenu handler to respect `rightClickBehavior`:

```typescript
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
```

- [ ] **Step 7: Add CWD tracking via OSC 7**

Add state and handler for CWD:

```typescript
const [cwd, setCwd] = React.useState<string>('');
```

In the data handler for each connection type (inside `pty:data`, `ssh:data`, etc.), add OSC 7 detection before `xterm.write()`:

```typescript
// In the data handler, before xterm.write():
const processData = (raw: string) => {
  // Detect OSC 7: \x1b]7;file://HOST/PATH\x1b\\  or  \x1b]7;file://HOST/PATH\x07
  const osc7Match = raw.match(/\x1b\]7;([^\x07\x1b]*)\x1b\\/);
  if (osc7Match) {
    try {
      const url = osc7Match[1];
      const parsed = new URL(url);
      const path = decodeURIComponent(parsed.pathname);
      if (path) {
        setCwd(path);
        onCwdChange?.(path);
      }
    } catch {}
    // Strip OSC 7 from output
    raw = raw.replace(/\x1b\]7;[^\x07\x1b]*\x1b\\/g, '');
  }
  xterm.write(raw);
};
```

Then replace `xterm.write(data as string)` calls with `processData(data as string)` in each connection handler.

Also for local PTY, send initial CWD tracking setup after spawn:

```typescript
// After pty:spawn success, start tracking CWD
if (connectionType === 'local') {
  // Poll CWD periodically
  const cwdInterval = setInterval(() => {
    const currentId = sessionIdRef.current;
    if (!currentId) return;
    window.electronAPI.invoke('pty:cwd', currentId).then((cwdResult: unknown) => {
      if (typeof cwdResult === 'string' && cwdResult) {
        setCwd(cwdResult);
        onCwdChange?.(cwdResult);
      }
    }).catch(() => {});
  }, 3000);
  // Store for cleanup
  cleanupFunctions.push(() => clearInterval(cwdInterval));
}
```

- [ ] **Step 8: Apply terminal padding via CSS**

In the JSX, update the terminal-container div style:

```typescript
<div ref={containerRef} className="terminal-container" style={{ padding: `${terminalPadding ?? 4}px` }} />
```

- [ ] **Step 9: Add cleanup array for dynamically added listeners**

At the start of the useEffect, add:

```typescript
const cleanupFunctions: (() => void)[] = [];
```

And in the cleanup return, add:

```typescript
cleanupFunctions.forEach(fn => fn());
```

- [ ] **Step 10: Add `bell:play` and `pty:cwd` IPC handlers in main process**

In `src/main/index.ts`, after the existing IPC handlers, add:

```typescript
ipcMain.handle('bell:play', () => {
  // Play system beep
  if (process.platform === 'win32') {
    require('child_process').exec('rundll32 user32.dll,MessageBeep');
  } else {
    process.stdout.write('\x07');
  }
});

ipcMain.handle('pty:cwd', async (_e, id: string) => {
  // Try to get CWD from /proc or lsof for the pty process
  try {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);
    if (process.platform === 'win32') {
      // Use wmic on Windows
      const { stdout } = await execFileAsync('wmic', ['process', 'where', `processid=${id}`, 'get', 'ExecutablePath']);
      // Fallback: just return empty
      return '';
    } else {
      // On Linux/macOS, try /proc
      const fs = require('fs');
      const cwdPath = `/proc/${id}/cwd`;
      try {
        return fs.readlinkSync(cwdPath);
      } catch {
        return '';
      }
    }
  } catch {
    return '';
  }
});
```

Also add the `buffer:export` handler:

```typescript
ipcMain.handle('buffer:export', async (_e, content: string, defaultName: string) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'Text Files', extensions: ['txt', 'log'] }],
  });
  if (filePath) {
    const fs = require('fs');
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }
  return null;
});
```

- [ ] **Step 11: Verify build compiles**

Run: `cd D:\terminal_op && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 12: Commit**

```bash
git add src/renderer/components/Terminal.tsx src/main/index.ts
git commit -m "feat: add copy-on-select, cursor config, drag-drop, word separator, right-click config, bell handling, CWD tracking, padding, and buffer export"
```

---

### Task 4: CWD Display in StatusBar + Tab Badges in TabBar

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/StatusBar.tsx`
- Modify: `src/renderer/components/TabBar.tsx`

- [ ] **Step 1: Add CWD state tracking in App.tsx**

In App.tsx, add state for CWD per pane and connection states per tab:

```typescript
const [paneCwds, setPaneCwds] = useState<Record<string, string>>({});
const [tabConnectionStates, setTabConnectionStates] = useState<Record<string, ConnectionState>>({});
```

Add `handleCwdChange` callback:

```typescript
const handleCwdChange = useCallback((paneId: string, cwd: string) => {
  setPaneCwds((prev) => ({ ...prev, [paneId]: cwd }));
}, []);
```

Modify `handleConnectionStateChange` to also track per-tab state:

```typescript
const handleConnectionStateChange = useCallback((paneId: string, state: ConnectionState, sessionId?: string) => {
  if (state === 'error') {
    addToast('error', 'Connection failed');
  } else if (state === 'disconnected') {
    addToast('warning', 'Connection lost');
  }
  setTabConnectionStates((prev) => ({ ...prev, [paneId]: state }));
}, [addToast]);
```

Pass `cwd` to StatusBar using focused pane's CWD:

```typescript
<StatusBar connectionInfo={connectionInfo} cwd={paneCwds[activeTab.focusedPaneId]} />
```

Pass `onCwdChange` to SplitPane, which passes it to Terminal.

- [ ] **Step 2: Pass connectionStates to TabBar**

Update TabBar props to include connection states:

```typescript
<TabBar
  tabs={tabs}
  activeId={activeId}
  onSelect={setActiveId}
  onClose={handleClose}
  onReorder={...}
  onRename={...}
  onNew={handleNew}
  onNewConnection={() => setConnDialogOpen(true)}
  onSettings={() => setSettingsOpen(true)}
  onSplitH={() => handleSplit(activeTab.focusedPaneId, 'horizontal')}
  onSplitV={() => handleSplit(activeTab.focusedPaneId, 'vertical')}
  onClear={() => window.dispatchEvent(new Event('terminal:clear'))}
  broadcasting={broadcasting}
  onToggleBroadcast={handleToggleBroadcast}
  connectionStates={tabConnectionStates}
  paneCwds={paneCwds}
/>
```

- [ ] **Step 3: Update TabBar to show connection state badges**

Add `connectionStates` prop to TabBar interface. In the tab item, add a badge before the title:

```tsx
{connectionStates && connectionStates[tab.id] === 'error' && (
  <span className="tab-badge tab-badge-error" />
)}
{connectionStates && connectionStates[tab.id] === 'disconnected' && (
  <span className="tab-badge tab-badge-disconnected" />
)}
{connectionStates && connectionStates[tab.id] === 'connecting' && (
  <span className="tab-badge tab-badge-connecting" />
)}
<span className="tab-title">{tab.title}</span>
```

- [ ] **Step 4: Update StatusBar to display CWD**

StatusBar already has a `cwd` prop. Ensure it's receiving data. No change needed since CWD is already displayed with `—` fallback. The wiring in App.tsx is what makes it work.

- [ ] **Step 5: Wire onCwdChange through SplitPane to Terminal**

In SplitPane, pass `onCwdChange` as a prop. Check SplitPane.tsx to see how it renders Terminal, and ensure `onCwdChange` is forwarded:

```typescript
<Terminal
  paneId={leaf.id}
  connectionType={leaf.connectionType}
  connectionOptions={leaf.connectionOptions}
  onConnectionStateChange={(state, sessionId) => onConnectionStateChange(leaf.id, state, sessionId)}
  onSplitH={onSplitH}
  onSplitV={onSplitV}
  onClosePane={onClosePane}
  reconnectKey={reconnectKeys[leaf.id] || 0}
  broadcasting={broadcasting}
  onCwdChange={(cwd) => onCwdChange?.(leaf.id, cwd)}
/>
```

This requires checking how `SplitPane` currently renders `Terminal` and adding the `onCwdChange` prop.

- [ ] **Step 6: Add buffer export command to CommandPalette**

In App.tsx commands array, add:

```typescript
{
  id: 'buffer:export',
  label: 'Export Buffer to File',
  category: 'Terminal',
  shortcut: 'Ctrl+Shift+S',
  action: () => {
    const xterm = /* get active terminal's xterm ref */;
    // We need to expose xterm refs. For now, dispatch an event.
    window.dispatchEvent(new CustomEvent('terminal:exportBuffer'));
  },
},
```

In Terminal.tsx, listen for this event and handle the export:

```typescript
const exportBufferHandler = () => {
  const xterm = xtermRef.current;
  if (!xterm) return;
  const buffer = xterm.buffer.active;
  const lines: string[] = [];
  for (let i = 0; i < buffer.length; i++) {
    const line = buffer.getLine(i);
    if (line) lines.push(line.translateToString(true));
  }
  const content = lines.join('\n');
  window.electronAPI.invoke('buffer:export', content, `terminal-export-${Date.now()}.txt`);
};
window.addEventListener('terminal:exportBuffer', exportBufferHandler);
```

Add cleanup:
```typescript
window.removeEventListener('terminal:exportBuffer', exportBufferHandler);
```

- [ ] **Step 7: Verify build compiles**

Run: `cd D:\terminal_op && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 8: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/StatusBar.tsx src/renderer/components/TabBar.tsx src/renderer/components/SplitPane.tsx
git commit -m "feat: add CWD display in status bar, connection state badges on tabs, and buffer export command"
```

---

### Task 5: Live Config Updates in Terminal

**Files:**
- Modify: `src/renderer/components/Terminal.tsx`

- [ ] **Step 1: Add useEffect for live config updates on existing terminals**

Add a useEffect that watches config changes and applies them to the running xterm instance:

```typescript
useEffect(() => {
  const xterm = xtermRef.current;
  if (!xterm) return;
  xterm.options.cursorStyle = cursorStyle ?? 'block';
  xterm.options.cursorBlink = cursorBlink ?? true;
  xterm.options.lineHeight = lineHeight ?? 1.0;
  xterm.options.letterSpacing = letterSpacing ?? 0;
  xterm.options.fontLigatures = fontLigatures ?? false;
  // wordSeparator requires recreating terminal - applied on next creation
}, [cursorStyle, cursorBlink, lineHeight, letterSpacing, fontLigatures]);
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:\terminal_op && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/Terminal.tsx
git commit -m "feat: apply config changes to running terminal instances in real-time"
```

---

### Task 6: Final Integration & Verification

- [ ] **Step 1: Run full build**

Run: `cd D:\terminal_op && npm run build`
Expected: Successful build with no errors

- [ ] **Step 2: Run TypeScript check**

Run: `cd D:\terminal_op && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Manual smoke test checklist**

Verify in the running app:
1. Settings panel shows all new sections (Appearance, Terminal, Cursor, Selection, Bell)
2. Changing cursor style updates terminal immediately
3. Copy-on-select checkbox works when enabled
4. Right-click behavior switches between context menu and paste
5. Word separators input persists
6. Font ligatures toggle persists
7. Line height and letter spacing sliders work
8. Terminal padding slider works
9. Bell style dropdown works (visual flash)
10. CWD shows in status bar for local terminal
11. Drag-and-drop file path onto terminal
12. Tab badges show for disconnected/error states
13. Keybinding reassignment UI works (click Edit, press keys)
14. Buffer export command works from command palette

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: integration fixes from smoke testing"
```