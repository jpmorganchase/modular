import React from 'react';
import { useRemoteView } from '../hooks/useRemoteView';

interface Props {
  url: string;
  loading?: JSX.Element;
}

function DefaultLoading() {
  return <div>Loading</div>;
}

export function RemoteView({ url, loading }: Props) {
  const ViewComponent = useRemoteView(url);
  const loadingOutput = loading ? loading : <DefaultLoading />;

  return (ViewComponent && <ViewComponent />) || loadingOutput;
}
