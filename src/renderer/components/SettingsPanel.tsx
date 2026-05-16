import React from 'react';
import { useTheme } from '../ThemeContext';
import { useKeybindings } from '../KeybindingContext';
import { useConfig } from '../ConfigContext';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenProfiles: () => void;
}

export default function SettingsPanel({ visible, onClose, onOpenProfiles }: Props) {
  const { themeId, setThemeId, availableThemes } = useTheme();
  const { bindings, resetAll } = useKeybindings();
  const { scrollback, updateConfig, gpuRenderer } = useConfig();
  const config = useConfig();
  const { t, i18n } = useTranslation();

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('settings.title')}</h2>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="modal-body">
          <div className="setting-group">
            <label>{t('settings.theme')}</label>
            <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
              {availableThemes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
            <label>{t('settings.scrollback')}</label>
            <input
              type="number"
              value={scrollback}
              min={1000}
              max={100000}
              step={1000}
              onChange={(e) => updateConfig({ scrollback: parseInt(e.target.value) || 10000 })}
            />
            <input
              type="range"
              value={scrollback}
              min={1000}
              max={100000}
              step={1000}
              onChange={(e) => updateConfig({ scrollback: parseInt(e.target.value) })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>
          <div className="setting-group">
            <label>{t('settings.gpuRenderer')}</label>
            <input
              type="checkbox"
              checked={gpuRenderer !== false}
              onChange={() => updateConfig({ gpuRenderer: !gpuRenderer })}
            />
          </div>
          <div className="setting-group">
            <label>{t('settings.windowOpacity')}</label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
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
            <label>{t('settings.profiles')}</label>
            <button className="btn-secondary" onClick={() => { onOpenProfiles(); onClose(); }}>Manage Profiles</button>
          </div>
          <div className="setting-group">
            <label>Keybindings</label>
            <div className="keybinding-list">
              {bindings.map((b) => (
                <div key={b.id} className="keybinding-row">
                  <span>{b.label}</span>
                  <kbd>{b.key}</kbd>
                </div>
              ))}
            </div>
            <button className="btn-secondary" onClick={resetAll}>Reset All</button>
          </div>
        </div>
      </div>
    </div>
  );
}