import React, { useState } from 'react';

export default function EsmCardView(): JSX.Element {
  const [contents, setContents] = useState('Some card contents');

  return (
    <div>
      <h1>My Card</h1>
      <span>{contents}</span>
      <button
        onClick={() => {
          setContents('Some mutated card contents');
        }}
      >
        Change card content
      </button>
    </div>
  );
}
