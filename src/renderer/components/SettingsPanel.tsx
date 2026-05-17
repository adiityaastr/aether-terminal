import React, { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { useKeybindings, recordKeybinding } from '../KeybindingContext';
import { useConfig } from '../ConfigContext';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenProfiles: () => void;
}

export default function SettingsPanel({ visible, onClose, onOpenProfiles }: Props) {
  const { themeId, setThemeId, availableThemes } = useTheme();
  const { bindings, resetBinding, updateBinding } = useKeybindings();
  const config = useConfig();
  const { updateConfig } = config;
  const { t, i18n } = useTranslation();
  const [recordingId, setRecordingId] = useState<string | null>(null);

  if (!visible) return null;

  const startRecording = (id: string) => {
    setRecordingId(id);
    const cleanup = recordKeybinding((combo: string) => {
      updateBinding(id, combo);
      setRecordingId(null);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('settings.title')}</h2>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="modal-body">

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.sectionAppearance')}</div>
            <div className="setting-group">
              <label>{t('settings.theme')}</label>
              <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
                {availableThemes.map((th) => <option key={th.id} value={th.id}>{th.name}</option>)}
              </select>
            </div>
            <div className="setting-group">
              <label>{t('settings.language')}</label>
              <select value={i18n.language} onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('language', e.target.value); }}>
                <option value="en">English</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
            </div>
            <div className="setting-group">
              <label>{t('settings.windowOpacity')}</label>
              <input
                type="range" min="10" max="100" step="5"
                value={Math.round((config.config.windowOpacity ?? 1) * 100)}
                onChange={(e) => updateConfig({ windowOpacity: parseInt(e.target.value) / 100 })}
                style={{ width: '100%' }}
              />
              <span>{Math.round((config.config.windowOpacity ?? 1) * 100)}%</span>
            </div>
            <div className="setting-group">
              <label>{t('settings.windowAcrylic')}</label>
              <input
                type="checkbox"
                checked={config.config.windowAcrylic ?? false}
                onChange={() => updateConfig({ windowAcrylic: !(config.config.windowAcrylic ?? false) })}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.gpuRenderer')}</label>
              <input
                type="checkbox"
                checked={config.gpuRenderer !== false}
                onChange={() => updateConfig({ gpuRenderer: !config.gpuRenderer })}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.sectionTerminal')}</div>
            <div className="setting-group">
              <label>{t('settings.fontFamily')}</label>
              <input
                type="text"
                value={config.config.fontFamily ?? "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace"}
                onChange={(e) => updateConfig({ fontFamily: e.target.value })}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.fontSize')}</label>
              <input
                type="number"
                value={config.fontSize}
                min={6} max={72}
                onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) || 14 })}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.scrollback')}</label>
              <input
                type="number"
                value={config.scrollback}
                min={1000} max={100000} step={1000}
                onChange={(e) => updateConfig({ scrollback: parseInt(e.target.value) || 10000 })}
              />
              <input
                type="range" value={config.scrollback}
                min={1000} max={100000} step={1000}
                onChange={(e) => updateConfig({ scrollback: parseInt(e.target.value) })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.lineHeight')}</label>
              <input
                type="range" min="0.8" max="2.0" step="0.1"
                value={config.lineHeight}
                onChange={(e) => updateConfig({ lineHeight: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span>{config.lineHeight.toFixed(1)}</span>
            </div>
            <div className="setting-group">
              <label>{t('settings.letterSpacing')}</label>
              <input
                type="range" min="-5" max="20" step="1"
                value={config.letterSpacing}
                onChange={(e) => updateConfig({ letterSpacing: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span>{config.letterSpacing}px</span>
            </div>
            <div className="setting-group">
              <label>{t('settings.fontLigatures')}</label>
              <input
                type="checkbox"
                checked={config.fontLigatures}
                onChange={() => updateConfig({ fontLigatures: !config.fontLigatures })}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.terminalPadding')}</label>
              <input
                type="range" min="0" max="24" step="1"
                value={config.terminalPadding}
                onChange={(e) => updateConfig({ terminalPadding: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <span>{config.terminalPadding}px</span>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.sectionCursor')}</div>
            <div className="setting-group">
              <label>{t('settings.cursorStyle')}</label>
              <select
                value={config.cursorStyle}
                onChange={(e) => updateConfig({ cursorStyle: e.target.value as 'block' | 'underline' | 'bar' })}
              >
                <option value="block">Block</option>
                <option value="underline">Underline</option>
                <option value="bar">Bar</option>
              </select>
            </div>
            <div className="setting-group">
              <label>{t('settings.cursorBlink')}</label>
              <input
                type="checkbox"
                checked={config.cursorBlink}
                onChange={() => updateConfig({ cursorBlink: !config.cursorBlink })}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.sectionSelection')}</div>
            <div className="setting-group">
              <label>{t('settings.copyOnSelect')}</label>
              <input
                type="checkbox"
                checked={config.copyOnSelect}
                onChange={() => updateConfig({ copyOnSelect: !config.copyOnSelect })}
              />
            </div>
            <div className="setting-group">
              <label>{t('settings.rightClickBehavior')}</label>
              <select
                value={config.rightClickBehavior}
                onChange={(e) => updateConfig({ rightClickBehavior: e.target.value as 'contextMenu' | 'paste' })}
              >
                <option value="contextMenu">Context Menu</option>
                <option value="paste">Paste</option>
              </select>
            </div>
            <div className="setting-group">
              <label>{t('settings.wordSeparator')}</label>
              <input
                type="text"
                value={config.wordSeparator}
                onChange={(e) => updateConfig({ wordSeparator: e.target.value })}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.sectionBell')}</div>
            <div className="setting-group">
              <label>{t('settings.bellStyle')}</label>
              <select
                value={config.bellStyle}
                onChange={(e) => updateConfig({ bellStyle: e.target.value as 'none' | 'visual' | 'audible' | 'both' })}
              >
                <option value="none">None</option>
                <option value="visual">Visual</option>
                <option value="audible">Audible</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('settings.profiles')}</div>
            <div className="setting-group">
              <button className="btn-secondary" onClick={() => { onOpenProfiles(); onClose(); }}>
                {t('settings.profiles')}
              </button>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Keybindings</div>
            <div className="keybinding-list">
              {bindings.map((b) => (
                <div key={b.id} className="keybinding-row">
                  <span>{b.label}</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {recordingId === b.id ? (
                      <kbd className="keybinding-recording">{t('settings.recordingKeybinding')}</kbd>
                    ) : (
                      <kbd>{b.key}</kbd>
                    )}
                    <button
                      className="keybinding-edit-btn"
                      onClick={() => startRecording(b.id)}
                      disabled={recordingId !== null}
                    >
                      {t('settings.editKeybinding')}
                    </button>
                    <button
                      className="keybinding-edit-btn"
                      onClick={() => resetBinding(b.id)}
                    >
                      {t('settings.resetKeybinding')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}