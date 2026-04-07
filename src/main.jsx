import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

import { LanguageProvider } from './contexts/LanguageContext';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <LanguageProvider>
            <BrowserRouter basename="/3pools_Web/">
                <App />
            </BrowserRouter>
        </LanguageProvider>
    </React.StrictMode>,
)
