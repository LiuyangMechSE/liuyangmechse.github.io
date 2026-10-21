import React from 'react';
import {createRoot} from 'react-dom/client';
import Portfolio from './portfolio';
import OwnerEditor from './owner-editor';
import './globals.css';
import {LanguageProvider} from './language';
createRoot(document.getElementById('root')!).render(<LanguageProvider>{window.location.pathname.endsWith('/editor.html') ? <OwnerEditor/> : <Portfolio canEdit={false}/>}</LanguageProvider>);
