import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CommandHistoryPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function CommandHistoryPanel({ visible, onClose }: CommandHistoryPanelProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (visible) {
      window.electronAPI.invoke('history:getAll').then((entries: unknown) => {
        setHistory(entries as string[]);
      });
    }
  }, [visible]);

  const filtered = filter
    ? history.filter((cmd) => cmd.toLowerCase().includes(filter.toLowerCase()))
    : history;

  const handleClear = async () => {
    if (window.confirm(t('history.clearConfirm'))) {
      await window.electronAPI.invoke('history:clear');
      setHistory([]);
    }
  };

  const handleCopy = (cmd: string) => {
    window.electronAPI.invoke('clipboard:writeText', cmd);
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('history.title')}</h2>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="modal-body" style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              className="history-search"
              type="text"
              placeholder={t('history.search')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button className="history-clear-btn" onClick={handleClear}>
              {t('history.clear')}
            </button>
          </div>
          <div className="history-list">
            {filtered.map((cmd, i) => (
              <div key={i} className="history-entry" onClick={() => handleCopy(cmd)} title={cmd}>
                {cmd}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="history-empty">{t('history.empty')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}