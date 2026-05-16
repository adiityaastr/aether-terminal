import React, { useState } from 'react';
import SFTPBrowser from './SFTPBrowser';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SFTPPanel({ visible, onClose }: Props) {
  const [sessionId, setSessionId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!visible) return null;

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      const id = await window.electronAPI.invoke('ssh:connect', {
        host,
        port: parseInt(port),
        username,
        password,
        cols: 80,
        rows: 24,
      }) as string;
      setSessionId(id);
    } catch (e: any) {
      setError(String(e));
    }
    setConnecting(false);
  };

  const handleDisconnect = () => {
    if (sessionId) {
      window.electronAPI.invoke('ssh:disconnect', sessionId).catch(() => {});
    }
    setSessionId('');
    setError('');
  };

  const handleClose = () => {
    handleDisconnect();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-panel sftp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>SFTP Browser</h2>
          <button className="modal-close" onClick={handleClose}>&#x2715;</button>
        </div>
        <div className="modal-body">
          {sessionId ? (
            <>
              <div className="sftp-connected-bar">
                <span>{username}@{host}:{port}</span>
                <button className="btn-primary" onClick={handleDisconnect}>Disconnect</button>
              </div>
              <SFTPBrowser sessionId={sessionId} />
            </>
          ) : (
            <>
              {error && <div className="sftp-error">{error}</div>}
              <div className="setting-group">
                <label>Host</label>
                <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.1" />
              </div>
              <div className="setting-group">
                <label>Port</label>
                <input value={port} onChange={(e) => setPort(e.target.value)} />
              </div>
              <div className="setting-group">
                <label>Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="setting-group">
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={handleConnect} disabled={connecting || !host || !username}>
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}