import actionPreflightCheck from './utils/actionPreflightCheck';
import { getPackageDependencies } from './utils/getPackageDependencies';
import stripAnsi from 'strip-ansi';

async function analyze({ target }: { target: string }): Promise<void> {
  console.log(
    stripAnsi(JSON.stringify(await getPackageDependencies(target), null, 2)),
  );
}

export default actionPreflightCheck(analyze);
