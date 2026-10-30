import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { TokenGate } from './components/TokenGate';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TokenGate>
      <App />
    </TokenGate>
  </React.StrictMode>
);
