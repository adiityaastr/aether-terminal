import React from 'react';

interface AutocompleteDropdownProps {
  suggestions: string[];
  selectedIndex: number;
  visible: boolean;
  position: { x: number; y: number };
  onSelect: (suggestion: string) => void;
  onDismiss: () => void;
}

export default function AutocompleteDropdown({ suggestions, selectedIndex, visible, position, onSelect }: AutocompleteDropdownProps) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div
      className="autocomplete-dropdown"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        background: '#1e1e2e',
        border: '1px solid #444',
        borderRadius: '4px',
        maxHeight: '200px',
        overflowY: 'auto',
        zIndex: 1000,
        minWidth: '200px',
        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
        fontSize: '13px',
      }}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion}
          className="autocomplete-item"
          style={{
            padding: '4px 8px',
            cursor: 'pointer',
            background: index === selectedIndex ? '#404060' : 'transparent',
            color: '#e0e0e0',
          }}
          onMouseEnter={() => {}}
          onMouseDown={() => onSelect(suggestion)}
        >
          {suggestion}
        </div>
      ))}
    </div>
  );
}