import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import '../styles/print.css';
import { PrintApp } from './PrintApp';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <PrintApp />
    </StrictMode>,
  );
}
