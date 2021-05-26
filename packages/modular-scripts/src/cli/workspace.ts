import program from './program';

program
  .command('workspace')
  .description('Retrieve the information for the current workspace info')
  .action(async () => {
    const { getWorkspaceInfo } = await import('../commands/getWorkspaceInfo');
    const workspace = await getWorkspaceInfo();
    console.log(JSON.stringify(workspace, null, 2));
  });
