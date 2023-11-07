import os from 'os';
import {
  computeConcurrencyOption,
  validateCompareOptions,
} from '../utils/options';

// Mocking process.exit and process.stderr.write for testing
const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('Exit called');
});
const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();

describe('validateCompareOptions', () => {
  afterEach(() => {
    exitSpy.mockClear();
    stderrSpy.mockClear();
  });

  it('should exit process when compareBranch is defined and changed is false', () => {
    expect(() => validateCompareOptions('branch', false)).toThrow(
      'Exit called',
    );
    expect(stderrSpy).toHaveBeenCalledWith(
      "Option --compareBranch doesn't make sense without option --changed\n",
    );
  });

  it('should not exit process when compareBranch is undefined', () => {
    expect(() => validateCompareOptions(undefined, false)).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

describe('computeConcurrencyOption', () => {
  afterEach(() => {
    exitSpy.mockClear();
    stderrSpy.mockClear();
  });

  it('should return the number of CPUs when concurrencyLevel is undefined', () => {
    const cpus = os.cpus().length;
    const result = computeConcurrencyOption(undefined);
    expect(result).toBe(cpus || 1);
  });

  it('should exit process when concurrencyLevel is not a valid number', () => {
    expect(() => computeConcurrencyOption('invalid')).toThrow('Exit called');
    expect(stderrSpy).toHaveBeenCalledWith(
      '--currencyLevel must be a number greater or equal than 0. You specified "invalid" instead.',
    );
  });

  it('should return parsed number when concurrencyLevel is a valid number', () => {
    const result = computeConcurrencyOption('2');
    expect(result).toBe(2);
  });
});
