import memoize from '../utils/memoize';

describe('memoize', () => {
  function createSymbol(description?: string) {
    return Symbol(description);
  }

  it('Memoize memoizes a function with non-empty arguments', () => {
    const getMemoizedSymbol = memoize(createSymbol);

    expect(getMemoizedSymbol('my-symbol')).toEqual(
      getMemoizedSymbol('my-symbol'),
    );
    expect(createSymbol('my-other-symbol')).not.toEqual(
      createSymbol('my-other-symbol'),
    );
  });

  it('Memoize memoizes a function with empty arguments', () => {
    const getMemoizedSymbol = memoize(createSymbol);

    expect(getMemoizedSymbol()).toEqual(getMemoizedSymbol());
    expect(createSymbol()).not.toEqual(createSymbol());
  });
});
