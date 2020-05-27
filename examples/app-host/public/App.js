import React from 'react';

function App() {
  return /*#__PURE__*/ React.createElement(
    'div',
    {
      className: 'App',
    },
    /*#__PURE__*/ React.createElement('link', {
      rel: 'stylesheet',
      href: 'app.css',
    }),
    /*#__PURE__*/ React.createElement(
      'header',
      {
        className: 'App-header',
      },
      /*#__PURE__*/ React.createElement('img', {
        src: 'logo.svg',
        className: 'App-logo',
        alt: 'logo',
      }),
      /*#__PURE__*/ React.createElement(
        'p',
        null,
        'Edit ',
        /*#__PURE__*/ React.createElement('code', null, 'src/App.js'),
        ' and save to reload.',
      ),
      /*#__PURE__*/ React.createElement(
        'a',
        {
          className: 'App-link',
          href: 'https://reactjs.org',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        'Learn React',
      ),
    ),
  );
}

export default App;
