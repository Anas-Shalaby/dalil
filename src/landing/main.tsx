import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { LandingPage } from './LandingPage';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <LandingPage />
    </StrictMode>,
  );
}
