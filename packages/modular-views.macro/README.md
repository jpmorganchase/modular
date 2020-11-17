## modular-views.macro

When used in a modular repository, this macro will scan all the available
packages, find the ones marked as 'views', and generates a map of names to the
views, each wrapped in `React.lazy`.

### usage

Suppose you have a modular repository, with a directory structure like so -

```
my-modular-repo
  packages
    app
    pkg-1
    pkg-2
    view-1
    view-2
    view-3
    view-4
    ...
    view-n
```

Then you can write code like this -

```jsx
import views from 'modular-views.macro';

console.log(views);

/* 
The above call would log this object - 

{
  'view-1': React.lazy(() => import('view-1')),
  'view-2': React.lazy(() => import('view-2')),
  'view-3': React.lazy(() => import('view-3')),
  'view-4': React.lazy(() => import('view-4')),
  // ...
  'view-n': React.lazy(() => import('view-n')),
}

Like magic!
*/
```
