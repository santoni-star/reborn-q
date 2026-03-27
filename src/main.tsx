import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from 'sonner'
import App from './App.tsx'
import './i18n'
import { firebaseService } from './services/firebaseService'
import { useStore } from './store/useStore'

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

// Connect Firebase tokens to Zustand store
firebaseService.setTokenCallback((token) => {
  console.log("[Main] Received new Google token, updating store...");
  useStore.getState().updateSettings({ googleAccessToken: token });
});

// Handle login results from redirects (critical for mobile/safari)
firebaseService.handleRedirectResult().then((user) => {
  if (user) {
    console.log("[Main] User logged in via redirect:", user.email);
  }
});

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div style={{ background: '#09090b', height: '100vh' }} />}>
        <Toaster position="bottom-right" richColors closeButton />
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
)
