import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('Main.tsx loaded');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  console.log('Rendering React app...');
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    console.log('App rendered successfully');
  } catch (error) {
    console.error('Error rendering app:', error);
    // Fallback to show error
    rootElement.innerHTML = `<div style="padding: 20px; color: red;"><h1>Error loading app</h1><pre>${error}</pre></div>`;
  }
}
