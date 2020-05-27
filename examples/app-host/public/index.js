import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.js';
import * as serviceWorker from './serviceWorker.js';
ReactDOM.render(
  /*#__PURE__*/ React.createElement(
    React.StrictMode,
    null,
    /*#__PURE__*/ React.createElement('link', {
      rel: 'stylesheet',
      href: 'index.css',
    }),
    /*#__PURE__*/ React.createElement(App, null),
  ),
  document.getElementById('root'),
); // If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA

serviceWorker.unregister();
