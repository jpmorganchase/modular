import { LazyExoticComponent, ComponentType } from 'react';

interface ViewMap<T = unknown> {
  [packageName: string]: LazyExoticComponent<ComponentType<T>>;
}
declare const views: ViewMap;

export default views;
