import React from 'react';
import ReactDOM from 'react-dom/client';
import DebugConsolePage from './pages/DebugConsolePage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <DebugConsolePage/>
    </React.StrictMode>,
);
