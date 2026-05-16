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
  const [transferring, setTransferring] = useState(false);
  const [transferFile, setTransferFile] = useState('');
  const [transferProgress, setTransferProgress] = useState<number | null>(null);

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

  useEffect(() => {
    const unsub = window.electronAPI.on(`sftp:progress:${sessionId}`, (data: unknown) => {
      const progress = data as { remotePath: string; transferred: number };
      setTransferProgress(progress.transferred);
    });
    return () => { unsub(); };
  }, [sessionId]);

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

  const handleUpload = async () => {
    const localPath = await window.electronAPI.invoke('dialog:openFile') as string | null;
    if (!localPath) return;
    setTransferring(true);
    setTransferProgress(0);
    const fileName = localPath.split(/[\\/]/).pop() || 'file';
    setTransferFile(fileName);
    const remotePath = cwd === '/' ? `/${fileName}` : `${cwd}/${fileName}`;
    try {
      await window.electronAPI.invoke('sftp:upload', sessionId, localPath, remotePath);
      loadDir(cwd);
    } catch (e: any) {
      setError(String(e));
    }
    setTransferring(false);
    setTransferProgress(null);
  };

  const handleDownload = async (entry: FileEntry) => {
    if (entry.isDir) return;
    const localPath = await window.electronAPI.invoke('dialog:saveFile', entry.name) as string | null;
    if (!localPath) return;
    setTransferring(true);
    setTransferProgress(0);
    setTransferFile(entry.name);
    const fullPath = cwd === '/' ? `/${entry.name}` : `${cwd}/${entry.name}`;
    try {
      await window.electronAPI.invoke('sftp:download', sessionId, fullPath, localPath);
    } catch (e: any) {
      setError(String(e));
    }
    setTransferring(false);
    setTransferProgress(null);
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
        <button className="sftp-btn" onClick={handleUpload} disabled={transferring}>Upload</button>
      </div>
      {error && <div className="sftp-error">{error}</div>}
      {transferring && transferProgress !== null && (
        <div className="sftp-progress">{transferFile}: {formatSize(transferProgress)} transferred</div>
      )}
      {loading ? (
        <div className="sftp-loading">Loading...</div>
      ) : (
        <div className="sftp-list">
          {files.map((f) => (
            <div key={f.name} className="sftp-item" onDoubleClick={() => f.isDir && navigate(f.name)}>
              <span className="sftp-icon">{f.isDir ? '📁' : '📄'}</span>
              <span className="sftp-name">{f.name}</span>
              <span className="sftp-size">{f.isDir ? '--' : formatSize(f.size)}</span>
              {!f.isDir && <button className="sftp-btn-sm" onClick={() => handleDownload(f)} title="Download">&#x2193;</button>}
              <button className="sftp-btn-sm" onClick={() => handleDelete(f)} title="Delete">&#x1F5D1;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}