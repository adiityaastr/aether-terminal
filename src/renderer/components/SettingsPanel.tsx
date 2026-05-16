import React from 'react';
import { useTheme } from '../ThemeContext';
import { useKeybindings } from '../KeybindingContext';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ visible, onClose }: Props) {
  const { themeId, setThemeId, availableThemes } = useTheme();
  const { bindings, resetAll } = useKeybindings();
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
