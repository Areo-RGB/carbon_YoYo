import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppStoreProvider } from './AppStore.tsx';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><AppStoreProvider><App /></AppStoreProvider></StrictMode>);
