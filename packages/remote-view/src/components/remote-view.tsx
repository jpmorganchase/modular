import React from 'react';
import { useRemoteView } from '../hooks/useRemoteView';

interface Props {
  url: string;
  loading?: JSX.Element;
  [args: string]: unknown;
}

function DefaultLoading() {
  return <div>Loading</div>;
}

export function RemoteView({ url, loading, ...args }: Props) {
  const ViewComponent = useRemoteView(url);
  const loadingOutput = loading ? loading : <DefaultLoading />;

  return (ViewComponent && <ViewComponent {...args} />) || loadingOutput;
}
