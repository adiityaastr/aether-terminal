# TerminalOp: Foundation First — Feature Design

**Date:** 2026-05-16
**Approach:** Foundation First (8 features — stability, completeness, and UX polish)

---

## Overview

TerminalOp is a cross-platform terminal emulator built with Electron + React + xterm.js. The current codebase has functional tabs, split panes, themes, SSH/Serial/Telnet backends, and a plugin system, but several critical paths are incomplete (e.g., ConnectionDialog doesn't wire up) and essential UX features are missing (copy/paste, saved profiles, context menu). This design fills those gaps.

---

## Feature 1: Connection Dialog Wired to Tabs

### Problem
`ConnectionDialog.onConnect` only does `console.log`. SSH, Serial, and Telnet connections are never actually created.

### Design
- Extend `Terminal` component to accept `connectionType` and `connectionOptions` props:
  ```typescript
  interface TerminalProps {
    connectionType: 'local' | 'ssh' | 'serial' | 'telnet';
    connectionOptions?: SSHConnectOpts | SerialConnectOpts | TelnetOpts;
  }
  ```
- In `Terminal.tsx`, spawn the appropriate backend based on `connectionType`:
  - `local`: `pty:spawn` (current behavior)
  - `ssh`: `ssh:connect` -> listen on `ssh:data:{id}`, send input via `ssh:input`
  - `serial`: `serial:connect` -> listen on `serial:data:{id}`
  - `telnet`: `telnet:connect` -> listen on `telnet:data:{id}`

- Add `PaneConnection` state to `App.tsx` to track each pane's connection type and session ID:
  ```typescript
  interface PaneConnection {
    type: 'local' | 'ssh' | 'serial' | 'telnet';
    sessionId?: string;
  }
  ```

- `ConnectionDialog.onConnect` will create a new tab (or optionally a new pane in the active tab) with the appropriate connection type.

### Auto Title
Tab titles auto-update based on connection:
- **Local PTY**: "Terminal {n}" (current behavior)
- **SSH**: "ssh: username@host"
- **Serial**: "serial: COM3 @ 9600"
- **Telnet**: "telnet: host:port"

Title updates in tab state upon successful connection. When process exits, suffix `[exited]` is appended.

---

## Feature 2: Copy/Paste

### Design
- Add key event handlers in `Terminal.tsx` via `attachCustomKeyEventHandler`:
  - `Ctrl+Shift+C`: Call `xterm.getSelection()`, write to clipboard via `navigator.clipboard.writeText()` (fallback to Electron clipboard API via IPC)
  - `Ctrl+Shift+V`: Read clipboard via `navigator.clipboard.readText()` (fallback to IPC), write to terminal via PTY/backend input

- Add clipboard-related IPC channels in `preload.ts`:
  - `clipboard:readText` -> `clipboard.readText()`
  - `clipboard:writeText` -> `clipboard.writeText()`

- These shortcuts will also be registered in the keybinding system so users can customize them.

---

## Feature 3: Saved Connection Profiles

### Problem
The `Profile` type exists in `types.d.ts` but there's no CRUD UI or quick-connect mechanism.

### Design
- **ProfilesPanel component** (accessible from SettingsPanel or as standalone dialog):
  - List profiles with name, type, and connection summary
  - Add/Edit form (same fields as ConnectionDialog, plus `name`)
  - Delete profile with confirmation

- **ConnectionDialog enhancements**:
  - New tab: "Saved Profiles"
  - Lists profiles with one-click quick-connect
  - "Manual Connect" tab retains current form

- **Default profile**: Add `defaultProfile` selector in SettingsPanel (already in AppConfig type)

- **Storage**: Via `config-manager.ts` — already has `AppConfig.profiles` and `AppConfig.defaultProfile`

### Profile Storage Format (existing)
```typescript
interface Profile {
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
```

---

## Feature 4: SFTP Upload & Download

### Problem
SFTP Browser only supports navigate and delete. Upload/download is a core SFTP feature.

### Design
- **Upload**:
  - "Upload" button in SFTP toolbar
  - Opens Electron file picker (`dialog.showOpenDialog`) for local file selection
  - IPC: `sftp:upload` (sessionId, localPath, remotePath)
  - Uses ssh2 `fastPut` method
  - Progress events sent to renderer via `sftp:progress:{id}`

- **Download**:
  - "Download" button per file entry, or right-click context menu
  - Opens save dialog (`dialog.showSaveDialog`)
  - IPC: `sftp:download` (sessionId, remotePath, localPath)
  - Uses ssh2 `fastGet` method
  - Progress events via `sftp:progress:{id}`

- **Progress bar**: Simple inline progress bar in SFTP browser, auto-hides when complete

- **Error handling**: Show error toast if transfer fails

- **UX polish**: Disable upload/delete buttons during loading, show file size on hover

---

## Feature 5: Scrollback Buffer Config

### Design
- Add `scrollback` field to `AppConfig` (default: 10000):
  ```typescript
  interface AppConfig {
    scrollback: number;
    // ... existing fields
  }
  ```

- **SettingsPanel**: New input with range slider (1000-100000, step 1000)

- **Terminal.tsx**: Read scrollback from config context, pass to xterm:
  ```typescript
  const xterm = new XTerm({
    scrollback: config.scrollback ?? 10000,
    // ... other options
  });
  ```

- Changes apply to new terminals; existing terminals keep their scrollback until recreated

---

## Feature 6: Drag-and-Drop Tabs

### Design
- **HTML5 Drag & Drop API** on `TabBar` component:
  - Each tab: `draggable={true}`
  - `onDragStart`: Save source tab index in dataTransfer
  - `onDragOver`: Calculate drop position, show drop indicator
  - `onDrop`: Call existing `onReorder(from, to)` callback

- **Visual feedback**:
  - Dragged tab: `opacity: 0.5`
  - Drop target: CSS indicator line between tabs
  - Smooth CSS transition on reorder

- `App.tsx` already provides `onReorder` handler — no state logic changes needed

---

## Feature 7: Terminal Context Menu

### Design
- **`TerminalContextMenu` component**: Positioned at right-click coordinates, hidden on outside click
  - Shown on `contextmenu` event in terminal container
  - Closed on click outside or after action

- **Menu items**:

| Menu Item | Shortcut | Action |
|-----------|----------|--------|
| Copy | Ctrl+Shift+C | Copy selection to clipboard |
| Paste | Ctrl+Shift+V | Paste from clipboard |
| Select All | — | Select all text in terminal |
| Split Horizontal | Ctrl+Shift+H | Split pane horizontal |
| Split Vertical | Ctrl+Alt+V | Split pane vertical |
| Clear | Ctrl+L | Clear terminal buffer |
| Search | Ctrl+F | Open search bar |
| --- | — | Separator |
| Zoom In | Ctrl+= | Increase font size |
| Zoom Out | Ctrl+- | Decrease font size |
| Reset Zoom | Ctrl+0 | Reset font to default |

- **Zoom** changes `fontSize` on the active terminal's xterm instance and persists to AppConfig

- Context menu receives callbacks from parent (copy, paste, split, clear, search, zoom) — shares logic with keyboard shortcuts

---

## Feature 8: Error Handling & Reconnection

### Design
- **`NotificationToast` component**:
  - Appears bottom-right corner
  - Shows error messages on connection failures: "SSH connection failed: Connection refused"
  - Shows info messages on disconnect: "SSH session closed by remote"
  - Auto-dismiss after 5 seconds, clickable to dismiss immediately
  - Different styles: error (red), warning (yellow), info (blue)

- **Terminal disconnect overlay**:
  - Semi-transparent overlay on top of disconnected terminal
  - Shows disconnect icon + message: "Connection lost"
  - Buttons:
    - **Reconnect** (for SSH, Telnet, Serial) — re-attempts connection with saved credentials
    - **Restart Terminal** (for local PTY) — spawns a new PTY
    - **Close Pane** — closes the pane

- **Reconnection logic**:
  - SSH/Telnet: Store last connection options per pane; Reconnect re-creates the connection
  - Serial: Re-open the serial port
  - Local PTY: Re-spawn via `pty:spawn`

- **Connection state tracking**: Each pane maintains a `connectionState`:
  ```typescript
  type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
  ```
  - `connecting`: Show spinner in tab title
  - `connected`: Normal operation
  - `disconnected`: Show overlay with reconnect option
  - `error`: Show overlay with error message and reconnect option

---

## File Structure Impact

New files:
- `src/renderer/components/ProfilesPanel.tsx` — Profile management UI
- `src/renderer/components/TerminalContextMenu.tsx` — Right-click context menu
- `src/renderer/components/NotificationToast.tsx` — Toast notification system
- `src/renderer/components/ConnectionOverlay.tsx` — Disconnect/reconnect overlay

Modified files:
- `src/renderer/App.tsx` — Add pane connection state, wire up ConnectionDialog
- `src/renderer/components/Terminal.tsx` — Accept connectionType/Options, zoom, clipboard
- `src/renderer/components/TabBar.tsx` — Drag-and-drop support, auto titles
- `src/renderer/components/SettingsPanel.tsx` — Scrollback config, profile management link
- `src/renderer/components/ConnectionDialog.tsx` — Saved profiles tab, create connections
- `src/renderer/components/SFTPBrowser.tsx` — Upload/download buttons, progress
- `src/renderer/themes.ts` — Zoom state (fontSize dynamic)
- `src/common/types.d.ts` — PaneConnection, ConnectionState types
- `src/main/sftp-manager.ts` — Upload/download handlers
- `src/main/config-manager.ts` — Scrollback, profiles CRUD
- `src/main/preload.ts` — Clipboard IPC channels

---

## Dependencies

No new npm dependencies required. All features use existing packages (xterm.js, Electron APIs, React).

