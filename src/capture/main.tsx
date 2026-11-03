import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { CaptureApp } from './CaptureApp';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <CaptureApp />
    </StrictMode>,
  );
}
