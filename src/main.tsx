import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { createPlatform } from '@/app/create-platform';
import { PlatformProvider } from '@/app/platform-context';
import '@/styles/tokens.css';
import '@/styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root is missing from index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <PlatformProvider platform={createPlatform()}>
      <App />
    </PlatformProvider>
  </StrictMode>,
);
