# TerminalOp: UX & Productivity Sprint — Feature Design

**Date:** 2026-05-17
**Approach:** Layered (Config Infra → Core UX → Power UX)
**Target User:** Developer/DevOps

---

## Overview

TerminalOp has solid foundations—tabs, split panes, SSH/Serial/Telnet, SFTP, profiles, themes, keybindings, autocomplete, command history, auto-update, and quake mode. This sprint fills the UX gaps that a developer feels daily: missing CWD tracking, no copy-on-select, no cursor style options, no output export, no file drag-drop, and several configuration holes.

---

## Layer 1 — Config Infrastructure

### Perluasan `AppConfig`

Tambah fields berikut ke `AppConfig` di `types.d.ts`, `ConfigContext.tsx`, dan `config-manager.ts`:

```typescript
interface AppConfig {
  // ... existing fields

  // Cursor
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;           // default: true

  // Selection
  copyOnSelect: boolean;          // default: false
  rightClickBehavior: 'contextMenu' | 'paste';  // default: 'contextMenu'
  wordSeparator: string;          // default: ' ()[]{}\'",:;~!@#$%^&*|+=?<>'

  // Typography
  fontLigatures: boolean;         // default: false
  lineHeight: number;             // default: 1.0, range 0.8-2.0
  letterSpacing: number;           // default: 0, range -5 to 20

  // Layout
  terminalPadding: number;        // default: 4, range 0-24

  // Bell
  bellStyle: 'none' | 'visual' | 'audible' | 'both';  // default: 'none'
}
```

**Default values di `config-manager.ts`:**

```typescript
const DEFAULT_CONFIG: AppConfig = {
  // ... existing defaults
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

### Settings Panel — Restructured Sections

Organize settings dalam grouped sections:

| Section | Fields |
|---------|--------|
| **Appearance** | Theme, Language, Window Opacity, Window Acrylic, GPU Renderer |
| **Terminal** | Font Family, Font Size, Line Height, Letter Spacing, Font Ligatures, Terminal Padding, Scrollback |
| **Cursor** | Cursor Style (dropdown: block/underline/bar), Cursor Blink (toggle) |
| **Selection** | Copy on Select (toggle), Word Separators (text input), Right-Click Behavior (dropdown) |
| **Bell** | Bell Style (dropdown: none/visual/audible/both) |
| **Profiles** | Manage Profiles button |
| **Keybindings** | Keybinding list with reassignment UI |

---

## Layer 2 — Core UX

### Feature 1: CWD Tracking

**Problem:** StatusBar menerima `cwd` prop tapi selalu `undefined`.

**Design:**
- Main process: Tambah IPC handler `pty:cwd` yang mengeksekusi `process.cwd()` di pty process
- Alternative (lebih reliable): Parse OSC 7 escape sequence dari terminal output. Shells seperti bash/zsh/fish dapat mengirim OSC 7 (`\033]7;file://HOST/PATH\033\\`)
- Renderer: `Terminal.tsx` listen ke `pty:cwd:{id}` event, update state
- App.tsx: Track `cwd` per pane, pass ke StatusBar

**Implementation detail:**
- Di main process, setelah pty spawn, check working directory via `pty.cwd` (node-pty exposes this on spawn, but not dynamically)
- Best approach: Use OSC 7 sequence parsing. Add handler in Terminal.tsx data handler that detects `\x1b]7;file://` sequences
- Also: on pty spawn, send initial CWD via `pty:cwd:{id}` IPC
- Expose `onCwdChange` callback di TerminalProps
- App.tsx maps paneId → cwd, passes focused pane's cwd ke StatusBar

### Feature 2: Copy-on-Select

**Design:**
- `Terminal.tsx`: Listen ke xterm `onSelectionChange` event
- Jika `copyOnSelect` config true dan selection is not empty → `window.electronAPI.invoke('clipboard:writeText', xterm.getSelection())`
- Only copy saat selection event fires (bukan saat deselect)
- Track selection state: `hasSelection` ref, only copy when transitioning dari no-selection → has-selection

### Feature 3: Cursor Style

**Design:**
- `Terminal.tsx`: Pass `cursorStyle` dan `cursorBlink` dari config ke xterm options saat init
- Provide update path: saat config berubah, update `xterm.options.cursorStyle` dan `xterm.options.cursorBlink` via useEffect

### Feature 4: Drag-and-Drop File Path

**Design:**
- `Terminal.tsx`: Add `onDrop` handler di terminal container
- Parse `event.dataTransfer.files`, convert ke OS path string
- Quote paths yang mengandung spasi
- Send path string ke terminal via `sendInput()`
- Also add `onDragOver` handler (prevent default to allow drop)

### Feature 5: Word Separator Configuration

**Design:**
- xterm.js meng-expose `wordSeparator` option
- `Terminal.tsx`: Read `wordSeparator` dari config, pass ke xterm:
  ```typescript
  const xterm = new XTerm({
    wordSeparator: wordSeparator ?? " ()[]{}'\"，:;~!@#$%^&*|+=?<>",
    // ... other options
  });
  ```
- Config changes applied on new terminals (consistent dengan scrollback behavior)

### Feature 6: Right-Click Behavior

**Design:**
- `Terminal.tsx`: Modify contextmenu event handler
- If `rightClickBehavior === 'paste'`:
  - Suppress default context menu
  - Read clipboard via IPC
  - Paste directly ke terminal
- If `rightClickBehavior === 'contextMenu'`:
  - Show existing context menu (current behavior)
- Middle-click always paste (linux convention)

### Feature 7: Font Ligatures

**Design:**
- `Terminal.tsx`: Pass `fontLigatures` dari config ke xterm options
- Note: Ligatures require canvas/WebGL renderer, not DOM renderer
- Add check: if `fontLigatures === true` and GPU renderer is off, show warning toast

### Feature 8: Line Height & Letter Spacing

**Design:**
- `Terminal.tsx`: Read `lineHeight` dan `letterSpacing` dari config
- Pass ke xterm constructor:
  ```typescript
  const xterm = new XTerm({
    lineHeight: lineHeight ?? 1.0,
    letterSpacing: letterSpacing ?? 0,
    // ... other options
  });
  ```
- Live update via useEffect: `xterm.options.lineHeight = value; xterm.options.letterSpacing = value;`

### Feature 9: Terminal Padding

**Design:**
- `Terminal.tsx`: Apply CSS padding ke terminal container dari config
- ```typescript
  <div ref={containerRef} className="terminal-container" style={{ padding: `${terminalPadding ?? 4}px` }} />
  ```
- Note: xterm.js does not have built-in padding option, so CSS is the correct approach

---

## Layer 3 — Power UX

### Feature 10: Output Export (Save Buffer)

**Design:**
- Command Palette: New command "Export Buffer to File" dengan shortcut `Ctrl+Shift+S`
- Implementation:
  1. Iterate `xterm.buffer.active` lines from 0 to `xterm.buffer.active.length`
  2. Strip ANSI escape sequences using regex
  3. Join dengan newlines
  4. Call `dialog.showSaveDialog` via IPC `buffer:export`
  5. Write file via `fs.writeFile`
- IPC channels:
  - `buffer:export` (main): receives sessionId + content, shows save dialog, writes file
  - `buffer:getContent` (renderer → main, returns content from renderer): actually we get content in renderer then pass to main for saving
- Alternative simpler approach: Get buffer content in renderer, send to main via IPC, main saves with dialog

### Feature 11: Keybinding Reassignment UI

**Design:**
- Settings Panel → Keybindings section:
  - Each keybinding row shows: action label, current shortcut, "Edit" button
  - Click "Edit" → enters recording mode → `recordKeybinding()` captures next keypress
  - Show recorded combo → "Save" or "Cancel"
  - "Reset" button per binding to restore default
- `KeybindingContext.tsx` already has `recordKeybinding` utility — wire it to UI
- Store overrides in localStorage (already implemented)

### Feature 12: Disconnected Tab Indicator Badge

**Design:**
- `TabBar.tsx`: Accept `connectionStates` prop mapping tabId → ConnectionState
- Render badge dot on tab:
  - Red dot for `error` state
  - Gray dot for `disconnected` state
- CSS class-based styling:
  ```css
  .tab-badge-error { background: var(--red); }
  .tab-badge-disconnected { background: #888; }
  ```
- App.tsx: Track connection state per tab, pass ke TabBar

### Feature 13: Bell Handling

**Design:**
- `Terminal.tsx`: Intercept xterm `onBell` event
- Based on `bellStyle` config:
  - `none`: Do nothing (suppress)
  - `visual`: Flash terminal background briefly (CSS animation class `terminal-bell-flash`)
  - `audible`: Play system beep via IPC `bell:play`
  - `both`: Visual + audible
- Main process: Register `bell:play` handler that calls `shell.beep()` or plays a sound file
- CSS for visual bell:
  ```css
  .terminal-bell-flash { animation: bell-flash 0.3s ease-out; }
  @keyframes bell-flash {
    0% { background: rgba(255, 255, 255, 0.3); }
    100% { background: none; }
  }
  ```

---

## File Structure Impact

### New Files
- None needed — all changes are in existing files

### Modified Files
- `src/common/types.d.ts` — Add new config fields to AppConfig
- `src/main/config-manager.ts` — Add defaults for new config fields
- `src/renderer/ConfigContext.tsx` — Expose new config fields, add to provider value
- `src/renderer/components/SettingsPanel.tsx` — Restructure with sections, add new settings controls
- `src/renderer/components/Terminal.tsx` — Add copy-on-select, cursor style, drag-drop, word separator, right-click config, font ligatures, line height, letter spacing, padding, bell handling, CWD tracking
- `src/renderer/App.tsx` — Pass CWD to StatusBar, track connection states per tab, add buffer export command, pass connectionStates to TabBar
- `src/renderer/components/TabBar.tsx` — Add connection state badge rendering
- `src/renderer/components/StatusBar.tsx` — Wire CWD display (already has prop, just needs data)
- `src/renderer/KeybindingContext.tsx` — Wire recordKeybinding to enable editing
- `src/main/index.ts` — Add `bell:play` and `buffer:export` IPC handlers, add CWD tracking for PTY

---

## Dependencies

No new npm dependencies required. All features use existing packages (xterm.js options, Electron APIs, React state).