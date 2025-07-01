import './bootstrap';
import '../css/app.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Crypto Dashboard';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        console.log('Inertia setup called with props:', props);
        try {
            const root = createRoot(el);
            root.render(<App {...props} />);
            console.log('React app rendered successfully');
        } catch (error) {
            console.error('Error rendering React app:', error);
            el.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error.message}</div>`;
        }
    },
    progress: {
        color: '#4B5563',
    },
}).catch(error => {
    console.error('Error creating Inertia app:', error);
});
