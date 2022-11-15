import add from '../index';

test('it should add two numbers', () => {
  expect(add(0.1, 0.2)).toEqual(0.30000000000000004);
});
