import '@testing-library/jest-dom';

// polyfill for node < 16
import 'string.prototype.replaceall/auto';

// Certain tests perform installs that take a while
jest.setTimeout(10 * 60 * 1000);
