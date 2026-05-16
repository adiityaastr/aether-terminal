import React from 'react';

export default function TitleBar() {
  return (
    <div className="titlebar" role="banner">
      <div className="titlebar-drag">
        <span className="titlebar-title">Aether</span>
      </div>
      <div className="titlebar-controls" role="toolbar" aria-label="Window controls">
        <button className="titlebar-btn" onClick={() => window.electronAPI.send('window:minimize')} aria-label="Minimize">&#x2014;</button>
        <button className="titlebar-btn" onClick={() => window.electronAPI.send('window:maximize')} aria-label="Maximize">&#x25A1;</button>
        <button className="titlebar-btn titlebar-btn-close" onClick={() => window.electronAPI.send('window:close')} aria-label="Close">&#x2715;</button>
      </div>
    </div>
  );
}
