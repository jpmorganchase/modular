import * as React from 'react';
import logo from './logo.svg';
import './EsmView.css';

export default function EsmView(): JSX.Element {
  return (
    <div className="EsmView">
      <header className="EsmView-header">
        <img src={logo} className="EsmView-logo" alt="logo" />
        <p>
          Edit <code>src/index.tsx</code> and save to reload.
        </p>
        <a
          className="EsmView-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}
