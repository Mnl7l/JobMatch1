import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// Immediately log for debugging
console.log('index.js executing, looking for root element');

// Get root element
const rootElement = document.getElementById('root');

if (rootElement) {
  console.log('Root element found, creating React root');
  try {
    const root = createRoot(rootElement);
    console.log('React root created, rendering app');
    
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    );
    console.log('Render method called');
  } catch (error) {
    console.error('Error during React rendering:', error);
    
    // Fallback rendering in case of error
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h2>JobMatch App Error</h2>
        <p>There was an error initializing the application: ${error.message}</p>
        <button onclick="window.location.reload()">Reload Application</button>
      </div>
    `;
  }
} else {
  console.error('Root element not found! DOM structure may be incorrect');
  
  // Create root element if missing
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
  console.log('Created new root element, attempting to render');
  
  const root = createRoot(newRoot);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}