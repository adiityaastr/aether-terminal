import React, { useState, useEffect } from 'react';
import i18n from '../i18n';

export default function UpdateNotification() {
  const [status, setStatus] = useState<string>('idle');
  const [version, setVersion] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    window.electronAPI.on('update:status', (s: unknown, v?: unknown) => {
      setStatus(s as string);
      if (s === 'available' && v && typeof v === 'string') {
        setVersion(v);
        setStatus('downloading');
      } else if (s === 'available') {
        setStatus('available');
      }
    });
    window.electronAPI.on('update:progress', (p: unknown) => {
      setProgress(p as number);
      setStatus('downloading');
    });
  }, []);

  if (status !== 'available' && status !== 'downloading' && status !== 'downloaded' && status !== 'error') {
    return null;
  }

  return (
    <div className="update-notification">
      {status === 'available' && (
        <>
          <span>{i18n.t('update.available')}{version ? ` (v${version})` : ''}</span>
          <button onClick={() => window.electronAPI.invoke('update:download')}>
            {i18n.t('update.download')}
          </button>
          <button onClick={() => setStatus('idle')}>{i18n.t('update.dismiss')}</button>
        </>
      )}
      {status === 'downloading' && (
        <div className="update-progress">
          <span>{i18n.t('update.downloading')}</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      {status === 'downloaded' && (
        <>
          <span>{i18n.t('update.downloaded')}</span>
          <button onClick={() => window.electronAPI.invoke('update:install')}>
            {i18n.t('update.install')}
          </button>
        </>
      )}
      {status === 'error' && (
        <span>{i18n.t('update.error')}</span>
      )}
    </div>
  );
}