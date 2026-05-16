import React, { useEffect, useRef } from 'react';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onSearch: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onSplitH?: () => void;
  onSplitV?: () => void;
}

export default function TerminalContextMenu({ x, y, onClose, onCopy, onPaste, onSelectAll, onClear, onSearch, onZoomIn, onZoomOut, onResetZoom, onSplitH, onSplitV }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="terminal-ctx-menu" style={{ left: x, top: y }}>
      <button onClick={() => { onCopy(); onClose(); }}>Copy</button>
      <button onClick={() => { onPaste(); onClose(); }}>Paste</button>
      <button onClick={() => { onSelectAll(); onClose(); }}>Select All</button>
      <div className="ctx-menu-sep" />
      {onSplitH && <button onClick={() => { onSplitH!(); onClose(); }}>Split Horizontal</button>}
      {onSplitV && <button onClick={() => { onSplitV!(); onClose(); }}>Split Vertical</button>}
      <button onClick={() => { onClear(); onClose(); }}>Clear</button>
      <button onClick={() => { onSearch(); onClose(); }}>Find</button>
      <div className="ctx-menu-sep" />
      <button onClick={() => { onZoomIn(); onClose(); }}>Zoom In</button>
      <button onClick={() => { onZoomOut(); onClose(); }}>Zoom Out</button>
      <button onClick={() => { onResetZoom(); onClose(); }}>Reset Zoom</button>
    </div>
  );
}