import { dismissRuntimeErrors, reportRuntimeError } from 'react-error-overlay';

module.exports = {
  clearRuntimeErrors: dismissRuntimeErrors,
  handleRuntimeError: reportRuntimeError,
};
