import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { createPlatform } from '@/app/create-platform';
import { createServices } from '@/app/services';
import { ServicesProvider } from '@/app/services-context';
import '@/styles/tokens.css';
import '@/styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root is missing from index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <ServicesProvider services={createServices(createPlatform())}>
      <App />
    </ServicesProvider>
  </StrictMode>,
);
