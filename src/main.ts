import { PomidorApp } from './components/PomidorApp.js';

/**
 * Main entry point for the Pomidor application
 */

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize the main application
    const app = new PomidorApp();
    
    // Make app globally available for debugging
    (window as any).pomidorApp = app;
    
    console.log('🍅 Pomidor v2.0 initialized successfully!');
    
    // Add error handling for unhandled errors
    window.addEventListener('error', (event) => {
      console.error('Unhandled error:', event.error);
      // Could send to analytics service here
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Could send to analytics service here
    });

  } catch (error) {
    console.error('Failed to initialize Pomidor app:', error);
    
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff4757;
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      z-index: 10000;
      font-family: sans-serif;
    `;
    errorDiv.innerHTML = `
      <h3>🚨 Initialization Error</h3>
      <p>Pomidor failed to start. Please refresh the page.</p>
      <button onclick="location.reload()" style="
        background: white;
        color: #ff4757;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 10px;
      ">Refresh Page</button>
    `;
    document.body.appendChild(errorDiv);
  }
});

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}