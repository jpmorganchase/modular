import * as React from 'react';
import sum from 'non-modular-buildable';

function App(): JSX.Element {
  return (
    <div className="App">
      <p>This is the sum:</p>
      <p>
        <code>7 + 7 = {sum(7, 7)}</code>
      </p>
    </div>
  );
}

export default App;
