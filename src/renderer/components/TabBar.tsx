import React, { useState, useRef } from 'react';

export interface Tab {
  id: string;
  title: string;
}

interface Props {
  tabs: Tab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onRename: (id: string, title: string) => void;
  onNew: () => void;
  onNewConnection: () => void;
  onSettings: () => void;
  onSplitH: () => void;
  onSplitV: () => void;
  onClear: () => void;
}

export default function TabBar({ tabs, activeId, onSelect, onClose, onReorder, onRename, onNew, onNewConnection, onSettings, onSplitH, onSplitV, onClear }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== toIdx) {
      onReorder(dragIdx.current, toIdx);
    }
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const handleDragEnd = () => { dragIdx.current = null; setDragOverIdx(null); };

  return (
    <div className="tab-bar" role="tablist">
      <div className="tab-list">
        {tabs.map((tab, idx) => (
          <div
            key={tab.id}
            role="tab"
            aria-selected={tab.id === activeId}
            draggable={editingId !== tab.id}
            className={`tab-item ${tab.id === activeId ? 'active' : ''} ${dragOverIdx === idx ? 'drag-over' : ''}`}
            onClick={() => onSelect(tab.id)}
            onDoubleClick={() => { setEditingId(tab.id); setEditValue(tab.title); }}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
          >
            {editingId === tab.id ? (
              <input
                className="tab-rename-input"
                value={editValue}
                autoFocus
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => { if (editValue.trim()) onRename(tab.id, editValue.trim()); setEditingId(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { if (editValue.trim()) onRename(tab.id, editValue.trim()); setEditingId(null); }
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="tab-title">{tab.title}</span>
            )}
            <button className="tab-close" onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}>×</button>
          </div>
        ))}
      </div>

      {/* Toolbar buttons */}
      <div className="tab-actions">
        <button className="toolbar-btn" onClick={onNew} title="New Tab (Ctrl+T)">＋</button>
        <button className="toolbar-btn" onClick={onSplitH} title="Split Horizontal (Ctrl+Shift+H)">⫼</button>
        <button className="toolbar-btn" onClick={onSplitV} title="Split Vertical (Ctrl+Shift+V)">⫻</button>
        <button className="toolbar-btn" onClick={onClear} title="Clear Terminal (Ctrl+L)">⌧</button>
        <button className="toolbar-btn" onClick={onNewConnection} title="New Connection">⛓</button>
        <div className="toolbar-sep" />
        <button className="toolbar-btn" onClick={onSettings} title="Settings">⚙</button>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div className="ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onMouseLeave={() => setCtxMenu(null)}>
          <button onClick={() => { onNew(); setCtxMenu(null); }}>New Tab</button>
          <button onClick={() => { onNewConnection(); setCtxMenu(null); }}>New Connection...</button>
          <hr />
          <button onClick={() => { onSplitH(); setCtxMenu(null); }}>Split Horizontal</button>
          <button onClick={() => { onSplitV(); setCtxMenu(null); }}>Split Vertical</button>
          <hr />
          <button onClick={() => { onClear(); setCtxMenu(null); }}>Clear Terminal</button>
          <button onClick={() => { onClose(ctxMenu.tabId); setCtxMenu(null); }}>Close Tab</button>
        </div>
      )}

      {menuOpen && <div className="dropdown-menu" onMouseLeave={() => setMenuOpen(false)} />}
    </div>
  );
}
