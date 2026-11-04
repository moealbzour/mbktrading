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

// Register Service Worker for PWA Add to Home Screen support
if ('serviceWorker' in navigator && (import.meta.env.PROD || window.location.protocol === 'https:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration skipped:', err);
    });
  });
}
