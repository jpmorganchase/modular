import stripAnsi from 'strip-ansi';
import actionPreflightCheck from './utils/actionPreflightCheck';
import { getPackageDependencies } from './utils/getPackageDependencies';

async function analyze({ target }: { target: string }): Promise<void> {
  console.log(
    stripAnsi(JSON.stringify(await getPackageDependencies(target), null, 2)),
  );
}

export default actionPreflightCheck(analyze);
