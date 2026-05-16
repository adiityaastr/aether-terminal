import React, { useState, useEffect, useCallback } from 'react';

interface FileEntry {
  name: string;
  size: number;
  isDir: boolean;
  modified: number;
}

interface Props {
  sessionId: string;
}

export default function SFTPBrowser({ sessionId }: Props) {
  const [cwd, setCwd] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true);
    setError('');
    try {
      const list = await window.electronAPI.invoke('sftp:list', sessionId, dir) as FileEntry[];
      list.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(list);
      setCwd(dir);
    } catch (e: any) {
      setError(String(e));
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadDir('/'); }, [loadDir]);

  const navigate = (name: string) => {
    const newPath = cwd === '/' ? `/${name}` : `${cwd}/${name}`;
    loadDir(newPath);
  };

  const goUp = () => {
    const parent = cwd.split('/').slice(0, -1).join('/') || '/';
    loadDir(parent);
  };

  const handleDelete = async (entry: FileEntry) => {
    const fullPath = cwd === '/' ? `/${entry.name}` : `${cwd}/${entry.name}`;
    try {
      if (entry.isDir) await window.electronAPI.invoke('sftp:rmdir', sessionId, fullPath);
      else await window.electronAPI.invoke('sftp:delete', sessionId, fullPath);
      loadDir(cwd);
    } catch (e: any) { setError(String(e)); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="sftp-browser">
      <div className="sftp-toolbar">
        <button className="sftp-btn" onClick={goUp} disabled={cwd === '/'}>&#x2191; Up</button>
        <span className="sftp-path">{cwd}</span>
        <button className="sftp-btn" onClick={() => loadDir(cwd)}>&#x21BB;</button>
      </div>
      {error && <div className="sftp-error">{error}</div>}
      {loading ? (
        <div className="sftp-loading">Loading...</div>
      ) : (
        <div className="sftp-list">
          {files.map((f) => (
            <div key={f.name} className="sftp-item" onDoubleClick={() => f.isDir && navigate(f.name)}>
              <span className="sftp-icon">{f.isDir ? '📁' : '📄'}</span>
              <span className="sftp-name">{f.name}</span>
              <span className="sftp-size">{f.isDir ? '--' : formatSize(f.size)}</span>
              <button className="sftp-btn-sm" onClick={() => handleDelete(f)} title="Delete">🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
