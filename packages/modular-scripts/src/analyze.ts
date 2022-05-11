import actionPreflightCheck from './utils/actionPreflightCheck';
import { getPackageDependencies } from './utils/getPackageDependencies';

async function analyze({ target }: { target: string }): Promise<void> {
  console.log(JSON.stringify(await getPackageDependencies(target), null, 2));
}

export default actionPreflightCheck(analyze);
