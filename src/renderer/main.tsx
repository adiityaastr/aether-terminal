import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './ThemeContext';
import { ConfigProvider } from './ConfigContext';
import { KeybindingProvider } from './KeybindingContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './i18n';
import './styles/global.css';

// Global error handlers
window.addEventListener('error', (e) => {
  window.electronAPI?.send('log:error', `Uncaught: ${e.message} at ${e.filename}:${e.lineno}`);
});
window.addEventListener('unhandledrejection', (e) => {
  window.electronAPI?.send('log:error', `Unhandled rejection: ${e.reason}`);
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <ConfigProvider>
        <KeybindingProvider>
          <App />
        </KeybindingProvider>
      </ConfigProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
