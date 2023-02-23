import React, { useEffect } from 'react';
import { SaltProvider } from '@salt-ds/core';
import App from './App';
import '@salt-ds/theme/index.css';

function injectFonts() {
  document.body.insertAdjacentHTML(
    'beforeend',
    '<link rel="preconnect" href="https://fonts.googleapis.com" />',
  );
  document.body.insertAdjacentHTML(
    'beforeend',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  );
  document.body.insertAdjacentHTML(
    'beforeend',
    '<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&family=PT+Mono&display=swap" rel="stylesheet" />',
  );
}

export default function RemoteViewDemos(): JSX.Element {
  useEffect(() => {
    injectFonts();
  }, []);

  return (
    <SaltProvider>
      <App />
    </SaltProvider>
  );
}
