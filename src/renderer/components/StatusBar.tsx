import React, { useState, useEffect } from 'react';
import i18n from '../i18n';

interface StatusBarProps {
  connectionInfo?: {
    type: string;
    detail?: string;
  };
  cwd?: string;
}

export default function StatusBar({ connectionInfo, cwd }: StatusBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const connLabel = connectionInfo
    ? `${connectionInfo.type}${connectionInfo.detail ? ': ' + connectionInfo.detail : ''}`
    : i18n.t('status.local');

  const timeStr = time.toLocaleTimeString();

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-item status-connection">{connLabel}</span>
      </div>
      <div className="status-bar-center">
        <span className="status-item status-cwd">{cwd || '—'}</span>
      </div>
      <div className="status-bar-right">
        <span className="status-item status-time">{timeStr}</span>
      </div>
    </div>
  );
}