import React, { useState, useRef, useCallback } from 'react';
import Terminal from './Terminal';

export type SplitDirection = 'horizontal' | 'vertical';

export interface PaneLeaf {
  type: 'leaf';
  id: string;
}

export interface PaneSplit {
  type: 'split';
  direction: SplitDirection;
  children: [PaneNode, PaneNode];
  ratio: number; // 0-1, first child's proportion
}

export type PaneNode = PaneLeaf | PaneSplit;

let paneIdCounter = 0;
export function newLeaf(): PaneLeaf {
  return { type: 'leaf', id: String(++paneIdCounter) };
}

interface SplitPaneProps {
  node: PaneNode;
  onSplit: (id: string, direction: SplitDirection) => void;
  onClose: (id: string) => void;
  focusedId: string;
  onFocus: (id: string) => void;
}

export default function SplitPane({ node, onSplit, onClose, focusedId, onFocus }: SplitPaneProps) {
  if (node.type === 'leaf') {
    return (
      <div
        className={`pane-leaf ${node.id === focusedId ? 'focused' : ''}`}
        onClick={() => onFocus(node.id)}
      >
        <Terminal />
      </div>
    );
  }

  return (
    <SplitContainer
      direction={node.direction}
      ratio={node.ratio}
      left={<SplitPane node={node.children[0]} onSplit={onSplit} onClose={onClose} focusedId={focusedId} onFocus={onFocus} />}
      right={<SplitPane node={node.children[1]} onSplit={onSplit} onClose={onClose} focusedId={focusedId} onFocus={onFocus} />}
    />
  );
}

interface SplitContainerProps {
  direction: SplitDirection;
  ratio: number;
  left: React.ReactNode;
  right: React.ReactNode;
}

function SplitContainer({ direction, ratio: initialRatio, left, right }: SplitContainerProps) {
  const [ratio, setRatio] = useState(initialRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const isHorizontal = direction === 'horizontal';

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = isHorizontal ? ev.clientX - rect.left : ev.clientY - rect.top;
      const size = isHorizontal ? rect.width : rect.height;
      const newRatio = Math.max(0.1, Math.min(0.9, pos / size));
      setRatio(newRatio);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [isHorizontal]);

  const style1 = isHorizontal
    ? { width: `${ratio * 100}%`, height: '100%' }
    : { height: `${ratio * 100}%`, width: '100%' };

  const style2 = isHorizontal
    ? { width: `${(1 - ratio) * 100}%`, height: '100%' }
    : { height: `${(1 - ratio) * 100}%`, width: '100%' };

  return (
    <div ref={containerRef} className={`split-container ${isHorizontal ? 'split-h' : 'split-v'}`}>
      <div className="split-child" style={style1}>{left}</div>
      <div className={`split-handle ${isHorizontal ? 'handle-h' : 'handle-v'}`} onMouseDown={onMouseDown} />
      <div className="split-child" style={style2}>{right}</div>
    </div>
  );
}
