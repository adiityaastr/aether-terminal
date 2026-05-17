import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Profile } from '../../common/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConnect: (type: string, opts: any) => void;
}

export default function ProfilesPanel({ visible, onClose, onConnect }: Props) {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (visible) {
      window.electronAPI.invoke('config:getProfiles').then((p: unknown) => setProfiles(p as Profile[]));
    }
  }, [visible]);

  if (!visible) return null;

  const saveProfile = async (profile: Profile) => {
    const result = await window.electronAPI.invoke('config:saveProfile', profile);
    setProfiles(result as Profile[]);
    setEditingProfile(null);
  };

  const deleteProfile = async (id: string) => {
    const result = await window.electronAPI.invoke('config:deleteProfile', id);
    setProfiles(result as Profile[]);
  };

  const connectProfile = (profile: Profile) => {
    const optsMap: Record<string, any> = {
      local: { shell: profile.shell || undefined },
      ssh: { host: profile.sshHost, port: profile.sshPort || 22, username: profile.sshUser, privateKeyPath: profile.sshKeyPath, cols: 80, rows: 24 },
      serial: { path: profile.serialPort, baudRate: profile.serialBaud || 9600 },
      telnet: { host: profile.telnetHost, port: profile.telnetPort || 23, cols: 80, rows: 24 },
    };
    onConnect(profile.type, optsMap[profile.type]);
  };

  const typeLabels: Record<string, string> = { local: 'Local', ssh: 'SSH', serial: 'Serial', telnet: 'Telnet' };
  const newProfile: Profile = { id: `p${Date.now()}`, name: 'New Profile', type: 'ssh' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Saved Profiles</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {editingProfile ? (
            <ProfileEditor profile={editingProfile} onSave={saveProfile} onCancel={() => setEditingProfile(null)} />
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button className="btn-primary" onClick={() => setEditingProfile({ ...newProfile, id: `p${Date.now()}` })}>Add Profile</button>
              </div>
              <div className="profile-list">
                {profiles.map((p) => (
                  <div key={p.id} className="profile-item">
                    <div className="profile-info">
                      <span className="profile-name">{p.name}</span>
                      <span className="profile-type">{typeLabels[p.type] || p.type}</span>
                      {p.type === 'ssh' && p.sshHost && <span className="profile-detail">{p.sshUser}@{p.sshHost}</span>}
                      {p.type === 'serial' && p.serialPort && <span className="profile-detail">{p.serialPort} @ {p.serialBaud}</span>}
                      {p.type === 'telnet' && p.telnetHost && <span className="profile-detail">{p.telnetHost}:{p.telnetPort}</span>}
                    </div>
                    <div className="profile-actions">
                      <button className="btn-primary" onClick={() => connectProfile(p)}>Connect</button>
                      <button className="btn-secondary" onClick={() => setEditingProfile({ ...p })}>Edit</button>
                      {p.id !== 'default' && <button className="btn-secondary" style={{ color: 'var(--red)' }} onClick={() => deleteProfile(p.id)}>Delete</button>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileEditor({ profile, onSave, onCancel }: { profile: Profile; onSave: (p: Profile) => void; onCancel: () => void }) {
  const [p, setP] = useState<Profile>(profile);
  const { t } = useTranslation();

  return (
    <div className="profile-editor">
      <div className="setting-group">
        <label>Name</label>
        <input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
      </div>
      <div className="setting-group">
        <label>Type</label>
        <select value={p.type} onChange={(e) => setP({ ...p, type: e.target.value as Profile['type'] })}>
          <option value="local">Local</option>
          <option value="ssh">SSH</option>
          <option value="serial">Serial</option>
          <option value="telnet">Telnet</option>
        </select>
      </div>
      <div className="setting-group">
        <label>{t('profile.shell')}</label>
        <input value={p.shell || ''} onChange={(e) => setP({ ...p, shell: e.target.value || undefined })} placeholder={t('profile.shellPlaceholder')} />
      </div>
      {p.type === 'ssh' && (
        <>
          <div className="setting-group"><label>Host</label><input value={p.sshHost || ''} onChange={(e) => setP({ ...p, sshHost: e.target.value })} placeholder="192.168.1.1" /></div>
          <div className="setting-group"><label>Port</label><input value={p.sshPort || 22} onChange={(e) => setP({ ...p, sshPort: parseInt(e.target.value) || 22 })} /></div>
          <div className="setting-group"><label>Username</label><input value={p.sshUser || ''} onChange={(e) => setP({ ...p, sshUser: e.target.value })} /></div>
          <div className="setting-group"><label>Key Path (optional)</label><input value={p.sshKeyPath || ''} onChange={(e) => setP({ ...p, sshKeyPath: e.target.value })} /></div>
        </>
      )}
      {p.type === 'serial' && (
        <>
          <div className="setting-group"><label>Port</label><input value={p.serialPort || ''} onChange={(e) => setP({ ...p, serialPort: e.target.value })} placeholder="COM3" /></div>
          <div className="setting-group"><label>Baud Rate</label>
            <select value={p.serialBaud || 9600} onChange={(e) => setP({ ...p, serialBaud: parseInt(e.target.value) })}>
              {['9600', '19200', '38400', '57600', '115200'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </>
      )}
      {p.type === 'telnet' && (
        <>
          <div className="setting-group"><label>Host</label><input value={p.telnetHost || ''} onChange={(e) => setP({ ...p, telnetHost: e.target.value })} /></div>
          <div className="setting-group"><label>Port</label><input value={p.telnetPort || 23} onChange={(e) => setP({ ...p, telnetPort: parseInt(e.target.value) || 23 })} /></div>
        </>
      )}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button className="btn-primary" onClick={() => onSave(p)}>Save</button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}