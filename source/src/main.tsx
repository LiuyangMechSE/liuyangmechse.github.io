import React from 'react';
import {createRoot} from 'react-dom/client';
import Portfolio from './portfolio';
import './globals.css';
createRoot(document.getElementById('root')!).render(<Portfolio canEdit={window.location.pathname.endsWith('/editor.html')} />);
