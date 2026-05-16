import React, { useState } from 'react';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConnect: (type: string, opts: any) => void;
}

type ConnType = 'ssh' | 'serial' | 'telnet';

export default function ConnectionDialog({ visible, onClose, onConnect }: Props) {
  const [tab, setTab] = useState<ConnType>('ssh');
  const [ssh, setSSH] = useState({ host: '', port: '22', username: '', password: '' });
  const [serial, setSerial] = useState({ path: '', baudRate: '9600' });
  const [telnet, setTelnet] = useState({ host: '', port: '23' });

  if (!visible) return null;

  const handleConnect = () => {
    if (tab === 'ssh') {
      onConnect('ssh', { ...ssh, port: parseInt(ssh.port), cols: 80, rows: 24 });
    } else if (tab === 'serial') {
      onConnect('serial', { path: serial.path, baudRate: parseInt(serial.baudRate) });
    } else {
      onConnect('telnet', { ...telnet, port: parseInt(telnet.port), cols: 80, rows: 24 });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Connection</h2>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="conn-tabs">
          {(['ssh', 'serial', 'telnet'] as ConnType[]).map((t) => (
            <button key={t} className={`conn-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="modal-body">
          {tab === 'ssh' && (
            <>
              <div className="setting-group">
                <label>Host</label>
                <input value={ssh.host} onChange={(e) => setSSH({ ...ssh, host: e.target.value })} placeholder="192.168.1.1" />
              </div>
              <div className="setting-group">
                <label>Port</label>
                <input value={ssh.port} onChange={(e) => setSSH({ ...ssh, port: e.target.value })} />
              </div>
              <div className="setting-group">
                <label>Username</label>
                <input value={ssh.username} onChange={(e) => setSSH({ ...ssh, username: e.target.value })} />
              </div>
              <div className="setting-group">
                <label>Password</label>
                <input type="password" value={ssh.password} onChange={(e) => setSSH({ ...ssh, password: e.target.value })} />
              </div>
            </>
          )}
          {tab === 'serial' && (
            <>
              <div className="setting-group">
                <label>Port (e.g. COM3)</label>
                <input value={serial.path} onChange={(e) => setSerial({ ...serial, path: e.target.value })} placeholder="COM3" />
              </div>
              <div className="setting-group">
                <label>Baud Rate</label>
                <select value={serial.baudRate} onChange={(e) => setSerial({ ...serial, baudRate: e.target.value })}>
                  {['9600', '19200', '38400', '57600', '115200'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </>
          )}
          {tab === 'telnet' && (
            <>
              <div className="setting-group">
                <label>Host</label>
                <input value={telnet.host} onChange={(e) => setTelnet({ ...telnet, host: e.target.value })} placeholder="towel.blinkenlights.nl" />
              </div>
              <div className="setting-group">
                <label>Port</label>
                <input value={telnet.port} onChange={(e) => setTelnet({ ...telnet, port: e.target.value })} />
              </div>
            </>
          )}
          <button className="btn-primary" onClick={handleConnect}>Connect</button>
        </div>
      </div>
    </div>
  );
}
