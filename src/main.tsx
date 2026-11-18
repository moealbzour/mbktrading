import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { SignalsProvider } from './context/SignalsContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <SignalsProvider>
      <App />
    </SignalsProvider>
  </ThemeProvider>
);

// Register Service Worker with immediate update check & one-time auto-refresh when a new SW replaces an old cache
if (
  'serviceWorker' in navigator &&
  (import.meta.env.PROD || window.location.protocol === 'https:' || window.location.hostname === 'localhost')
) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js?v=6', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch((err) => {
        console.log('SW registration skipped:', err);
      });
  });
}
