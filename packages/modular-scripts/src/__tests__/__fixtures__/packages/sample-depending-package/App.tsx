import * as React from 'react';
// @ts-ignore
import summer from 'sample-library-package';

declare function summer(a: number, b: number): number;
function App(): JSX.Element {
  const result = summer(7, 7);
  return (
    <div className="App">
      <header className="App-header">
        <p>This is the result: {result}</p>
      </header>
    </div>
  );
}

export default App;
