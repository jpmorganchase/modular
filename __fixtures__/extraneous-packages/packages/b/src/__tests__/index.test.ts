import multiply from '../index';

test('it should multiply two numbers', () => {
  console.log('testing b:index.test.ts');
  expect(multiply(4, 5)).toEqual(20);
});
