import React, { useState } from 'react';

export default function EsmListView(): JSX.Element {
  const [contents, setContents] = useState(['foo', 'bar', 'baz']);

  return (
    <div>
      <h1>My List</h1>
      <ul>
        {contents.map((item) => (
          <li>{item}</li>
        ))}
      </ul>
      <button
        onClick={() => {
          setContents(['baz', 'bar', 'foo']);
        }}
      >
        Invert list order
      </button>
    </div>
  );
}
