import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AppStateProvider } from './context/AppState.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <AppStateProvider>
    <App />
  </AppStateProvider>
);
