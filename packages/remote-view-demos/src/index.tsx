import React, { useEffect, useState } from 'react';
import { Button, SaltProvider, Panel } from '@salt-ds/core';
import App from './App';
import '@salt-ds/theme/index.css';

const MemoPanel = React.memo(Panel);

// When Modular 4.2 is available, instead of this, we could use a templateable index.html
function injectFonts() {
  if (document.querySelectorAll('[data-injected-fonts]').length) {
    return;
  }

  document.body.insertAdjacentHTML(
    'beforeend',
    '<link rel="preconnect" href="https://fonts.googleapis.com" data-injected-fonts="foo" />',
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

type SaltTheme = 'light' | 'dark';

export default function RemoteViewDemos(): JSX.Element {
  const [theme, setTheme] = useState<SaltTheme>('light');

  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }

  useEffect(() => {
    injectFonts();
  });

  return (
    <SaltProvider mode={theme}>
      <MemoPanel>
        <App
          toggleThemeButton={
            <Button onClick={toggleTheme}>Toggle Theme</Button>
          }
        />
      </MemoPanel>
    </SaltProvider>
  );
}
