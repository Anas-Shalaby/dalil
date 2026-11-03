import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { PrivacyApp } from './PrivacyApp';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <PrivacyApp />
    </StrictMode>,
  );
}
