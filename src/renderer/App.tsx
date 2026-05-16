import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import TitleBar from './components/TitleBar';
import TabBar, { Tab } from './components/TabBar';
import SplitPane, { PaneNode, PaneLeaf, PaneSplit, SplitDirection, newLeaf } from './components/SplitPane';
import CommandPalette, { Command } from './components/CommandPalette';
import SettingsPanel from './components/SettingsPanel';
import ConnectionDialog from './components/ConnectionDialog';
import { useKeybindingHandler, useKeybindings } from './KeybindingContext';
import { useTheme } from './ThemeContext';

interface TabState extends Tab {
  paneTree: PaneNode;
  focusedPaneId: string;
}

let nextTabId = 1;
function createTabState(): TabState {
  const leaf = newLeaf();
  return { id: String(nextTabId++), title: `Terminal ${nextTabId - 1}`, paneTree: leaf, focusedPaneId: leaf.id };
}

// Helper: split a leaf node in the tree
function splitNode(tree: PaneNode, targetId: string, direction: SplitDirection): { tree: PaneNode; newId: string } | null {
  if (tree.type === 'leaf') {
    if (tree.id === targetId) {
      const newChild = newLeaf();
      const split: PaneSplit = { type: 'split', direction, children: [tree, newChild], ratio: 0.5 };
      return { tree: split, newId: newChild.id };
    }
    return null;
  }
  // Recurse into children
  const leftResult = splitNode(tree.children[0], targetId, direction);
  if (leftResult) {
    return { tree: { ...tree, children: [leftResult.tree as any, tree.children[1]] }, newId: leftResult.newId };
  }
  const rightResult = splitNode(tree.children[1], targetId, direction);
  if (rightResult) {
    return { tree: { ...tree, children: [tree.children[0], rightResult.tree as any] }, newId: rightResult.newId };
  }
  return null;
}

// Helper: remove a leaf and return sibling
function removeNode(tree: PaneNode, targetId: string): PaneNode | null {
  if (tree.type === 'leaf') return null;
  const [left, right] = tree.children;
  if (left.type === 'leaf' && left.id === targetId) return right;
  if (right.type === 'leaf' && right.id === targetId) return left;
  const leftResult = removeNode(left, targetId);
  if (leftResult) return { ...tree, children: [leftResult, right] } as PaneSplit;
  const rightResult = removeNode(right, targetId);
  if (rightResult) return { ...tree, children: [left, rightResult] } as PaneSplit;
  return null;
}

function getFirstLeafId(node: PaneNode): string {
  if (node.type === 'leaf') return node.id;
  return getFirstLeafId(node.children[0]);
}

export default function App() {
  const [tabs, setTabs] = useState<TabState[]>(() => [createTabState()]);
  const [activeId, setActiveId] = useState<string>('1');
  const [loaded, setLoaded] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connDialogOpen, setConnDialogOpen] = useState(false);
  const { bindings } = useKeybindings();
  const { setThemeId, availableThemes } = useTheme();

  // Restore session on mount
  useEffect(() => {
    window.electronAPI.invoke('session:load').then((session: unknown) => {
      const s = session as { tabs: TabState[]; activeTabId: string } | null;
      if (s && s.tabs.length > 0) {
        setTabs(s.tabs);
        setActiveId(s.activeTabId);
      }
      setLoaded(true);
    });
  }, []);

  const activeTab = tabs.find((t) => t.id === activeId)!;

  const handleNew = useCallback(() => {
    const tab = createTabState();
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, []);

  const handleClose = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) return prev;
      return next;
    });
    setActiveId((current) => {
      if (current !== id) return current;
      const idx = tabs.findIndex((t) => t.id === id);
      const fallback = tabs[idx - 1] || tabs[idx + 1];
      return fallback?.id || tabs[0].id;
    });
  }, [tabs]);

  const handleSplit = useCallback((paneId: string, direction: SplitDirection) => {
    setTabs((prev) => prev.map((tab) => {
      if (tab.id !== activeId) return tab;
      const result = splitNode(tab.paneTree, paneId, direction);
      if (!result) return tab;
      return { ...tab, paneTree: result.tree, focusedPaneId: result.newId };
    }));
  }, [activeId]);

  const handleClosePane = useCallback((paneId: string) => {
    setTabs((prev) => prev.map((tab) => {
      if (tab.id !== activeId) return tab;
      if (tab.paneTree.type === 'leaf') return tab; // don't close last pane
      const result = removeNode(tab.paneTree, paneId);
      if (!result) return tab;
      return { ...tab, paneTree: result, focusedPaneId: getFirstLeafId(result) };
    }));
  }, [activeId]);

  const handleFocus = useCallback((paneId: string) => {
    setTabs((prev) => prev.map((tab) => {
      if (tab.id !== activeId) return tab;
      return { ...tab, focusedPaneId: paneId };
    }));
  }, [activeId]);

  // Keybinding-driven shortcuts
  useKeybindingHandler({
    'tab:new': handleNew,
    'tab:close': () => handleClose(activeId),
    'tab:next': () => {
      const idx = tabs.findIndex((t) => t.id === activeId);
      setActiveId(tabs[(idx + 1) % tabs.length].id);
    },
    'tab:prev': () => {
      const idx = tabs.findIndex((t) => t.id === activeId);
      setActiveId(tabs[(idx - 1 + tabs.length) % tabs.length].id);
    },
    'pane:splitH': () => handleSplit(activeTab.focusedPaneId, 'horizontal'),
    'pane:splitV': () => handleSplit(activeTab.focusedPaneId, 'vertical'),
    'pane:close': () => handleClosePane(activeTab.focusedPaneId),
    'palette:open': () => setPaletteOpen(true),
  });

  // Command palette commands
  const commands: Command[] = useMemo(() => {
    const cmds: Command[] = [
      { id: 'tab:new', label: 'New Tab', category: 'Tab', shortcut: bindings.find((b) => b.id === 'tab:new')?.key, action: handleNew },
      { id: 'tab:close', label: 'Close Tab', category: 'Tab', action: () => handleClose(activeId) },
      { id: 'pane:splitH', label: 'Split Horizontal', category: 'Pane', action: () => handleSplit(activeTab.focusedPaneId, 'horizontal') },
      { id: 'pane:splitV', label: 'Split Vertical', category: 'Pane', action: () => handleSplit(activeTab.focusedPaneId, 'vertical') },
      { id: 'pane:close', label: 'Close Pane', category: 'Pane', action: () => handleClosePane(activeTab.focusedPaneId) },
      ...availableThemes.map((t) => ({
        id: `theme:${t.id}`, label: `Theme: ${t.name}`, category: 'Appearance', action: () => setThemeId(t.id),
      })),
    ];
    return cmds;
  }, [activeId, activeTab, tabs, handleNew, handleClose, handleSplit, handleClosePane, bindings, availableThemes, setThemeId]);

  // Session save (debounced, every 5s after change)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const session = {
        tabs: tabs.map((t) => ({ id: t.id, title: t.title, paneTree: t.paneTree, focusedPaneId: t.focusedPaneId })),
        activeTabId: activeId,
      };
      window.electronAPI.invoke('session:save', session);
    }, 5000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [tabs, activeId]);

  return (
    <div className="app">
      <TitleBar />
      <TabBar
        tabs={tabs}
        activeId={activeId}
        onSelect={setActiveId}
        onClose={handleClose}
        onReorder={(from, to) => {
          setTabs((prev) => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
          });
        }}
        onRename={(id, title) => {
          setTabs((prev) => prev.map((t) => t.id === id ? { ...t, title } : t));
        }}
        onNew={handleNew}
        onNewConnection={() => setConnDialogOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onSplitH={() => handleSplit(activeTab.focusedPaneId, 'horizontal')}
        onSplitV={() => handleSplit(activeTab.focusedPaneId, 'vertical')}
        onClear={() => window.dispatchEvent(new Event('terminal:clear'))}
      />
      <div className="app-content">
        {tabs.map((tab) => (
          <div key={tab.id} className="tab-panel" style={{ display: tab.id === activeId ? 'flex' : 'none' }}>
            <SplitPane
              node={tab.paneTree}
              onSplit={handleSplit}
              onClose={handleClosePane}
              focusedId={tab.focusedPaneId}
              onFocus={handleFocus}
            />
          </div>
        ))}
      </div>
      <CommandPalette commands={commands} visible={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <SettingsPanel visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConnectionDialog
        visible={connDialogOpen}
        onClose={() => setConnDialogOpen(false)}
        onConnect={(type, opts) => {
          console.log('Connect:', type, opts);
          // TODO: open connection tab with appropriate backend
        }}
      />
    </div>
  );
}
