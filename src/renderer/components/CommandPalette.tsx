import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface Command {
  id: string;
  label: string;
  category?: string;
  shortcut?: string;
  action: () => void;
}

interface Props {
  commands: Command[];
  visible: boolean;
  onClose: () => void;
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function CommandPalette({ commands, visible, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return commands;
    return commands.filter((c) => fuzzyMatch(query, c.label) || fuzzyMatch(query, c.category || ''));
  }, [query, commands]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  useEffect(() => { setSelectedIdx(0); }, [filtered]);

  if (!visible) return null;

  const execute = (cmd: Command) => {
    cmd.action();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIdx]) { execute(filtered[selectedIdx]); }
  };

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="palette-list">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`palette-item ${i === selectedIdx ? 'selected' : ''}`}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span className="palette-label">
                {cmd.category && <span className="palette-cat">{cmd.category}: </span>}
                {cmd.label}
              </span>
              {cmd.shortcut && <span className="palette-shortcut">{cmd.shortcut}</span>}
            </div>
          ))}
          {filtered.length === 0 && <div className="palette-empty">No commands found</div>}
        </div>
      </div>
    </div>
  );
}
