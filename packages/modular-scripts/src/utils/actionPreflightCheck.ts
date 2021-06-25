import * as logger from './logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModularAction = (...args: any[]) => Promise<void>;

function actionPreflightCheck(fn: ModularAction): ModularAction {
  const wrappedFn: ModularAction = async (...args) => {
    const { check } = await import('../check');

    if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
      await check();
    } else {
      logger.warn(
        'Preflight check is skipped. Modular repository may be invalid.',
      );
    }

    return fn(...args);
  };

  return wrappedFn;
}

export default actionPreflightCheck;
