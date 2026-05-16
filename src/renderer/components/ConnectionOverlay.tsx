import React from 'react';
import type { ConnectionType, ConnectionState } from '../../common/types';

interface Props {
  connectionType: ConnectionType;
  connectionState: ConnectionState;
  onReconnect: () => void;
  onClose: () => void;
}

export default function ConnectionOverlay({ connectionType, connectionState, onReconnect, onClose }: Props) {
  const messages: Record<ConnectionState, string> = {
    connecting: 'Connecting...',
    connected: '',
    disconnected: connectionType === 'local' ? 'Process exited' : 'Connection lost',
    error: connectionType === 'local' ? 'Process failed' : 'Connection failed',
  };

  if (connectionState === 'connected' || connectionState === 'connecting') return null;

  return (
    <div className="connection-overlay">
      <h3>{messages[connectionState]}</h3>
      <div className="overlay-actions">
        <button className="btn-primary" onClick={onReconnect}>
          {connectionType === 'local' ? 'Restart' : 'Reconnect'}
        </button>
        <button className="btn-secondary-overlay" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}