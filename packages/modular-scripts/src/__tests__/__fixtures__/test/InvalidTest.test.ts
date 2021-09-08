// eslint-disable-next-line jest/no-disabled-tests
describe.skip('A failing test', () => {
  it('should fail', () => {
    expect(true).toEqual(false);
  });
});

// eslint-disable-next-line jest/no-export
export {};
