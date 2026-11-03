import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import '../styles/pdf.css';
import { StudioApp } from './StudioApp';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <StudioApp />
    </StrictMode>,
  );
}
