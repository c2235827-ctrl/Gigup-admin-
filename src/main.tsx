import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AmbassadorApp from './AmbassadorApp.tsx';
import './index.css';

const path = window.location.pathname;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {path.startsWith('/ambassador') ? <AmbassadorApp /> : <App />}
  </StrictMode>,
);
