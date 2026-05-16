import React, { useState, useRef, useEffect } from 'react';
import type { SearchAddon } from '@xterm/addon-search';

interface Props {
  searchAddon: SearchAddon | null;
  visible: boolean;
  onClose: () => void;
}

export default function SearchBar({ searchAddon, visible, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  const findNext = () => {
    if (searchAddon && query) searchAddon.findNext(query, { caseSensitive });
  };

  const findPrev = () => {
    if (searchAddon && query) searchAddon.findPrevious(query, { caseSensitive });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.shiftKey ? findPrev() : findNext();
    } else if (e.key === 'Escape') {
      searchAddon?.clearDecorations();
      onClose();
    }
  };

  return (
    <div className="search-bar" role="search" aria-label="Search in terminal">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); }}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="search-input"
        aria-label="Search text"
      />
      <button className="search-btn" onClick={() => setCaseSensitive(!caseSensitive)} title="Case Sensitive" aria-pressed={caseSensitive} aria-label="Toggle case sensitive">
        {caseSensitive ? 'Aa' : 'aa'}
      </button>
      <button className="search-btn" onClick={findPrev} title="Previous" aria-label="Previous match">&#x25B2;</button>
      <button className="search-btn" onClick={findNext} title="Next" aria-label="Next match">&#x25BC;</button>
      <button className="search-btn" onClick={onClose} title="Close" aria-label="Close search">&#x2715;</button>
    </div>
  );
}
