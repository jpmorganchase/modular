## Views

User Interfaces are made of components. When you sketch a wireframe on a
whiteboard or graphics tool of choice, the rectangles that you draw define the
visual and semantic boundaries of these components. They usually correspond to
some equivalent in your UI framework (e.g - In
[React](https://reactjs.org/docs/components-and-props.html), these are defined
as classes that extend from React.Component, or regular functions that return
JSX. In [Flutter](https://flutter.dev/docs/development/ui/widgets), these are
classes that extend from different types of Views. In
[Jetpack Compose](https://developer.android.com/jetpack#foundation-components),
these are called Composable Functions). These are a neat unit of encapsulating
state, behaviour and presentation. They also _compose_ with each other to
provide higher abstraction of UI, eventually forming the application itself.

Every application also has a concept of 'primary' components. These are
'top-level' components that are considered special, and most important when
describing the high level architecture of an application.

For example, a site that operates as a blog will probably have these primary
components - `<Home/>`, `<Posts query={query}>`, `<Post id={id}/>`,
`<Contact/>`. These would associate with routes like `/`,
`/posts?offset=20&length=10`, `/post/:id/:slug`, `/contact`. Further, `<Home/>`
may just be an alias for `<Posts/>` with a default query. It all depends on
whoever's implementing the site, of course. Each of these components would be
composed of a number of secondary components (and could also be sharing these
components among themselves).

An e-commerce site would have different primary component, `<Home/>`,
`<Search query={query}/>`, `<Details id={id}/>`, `<Checkout/>`, `<Payment/>`,
and `<Profile id={id}/>`. Like the above, it could also have routing patterns
for each of these components, and could be composed by a number of secondary
components.

For applications that behave like dashboards, we still have the concept of
primary components; there will be a host/container component (let's say we call
it `<App/>`), but pages will be composed of a number of primary components
(which could be charts, graphs, tables, lists; whatever developers and product
managers feel is a window into a data slice relevant to a user). Routes are then
used to show different user-generated dashboards composed of these primary
components (the layouts for which are probably stored on a database somewhere),
or for drilling down into a particular component to expose and interact with
more data. As before, these primary components are composed of a number of
secondary components, possibly sharing low level components amongst themselves.

In `modular`, these primary components are what we call 'views'.

As these sites scale through time, we notice some patterns emerge in the
development of views. They'll usually start as single files, usually all under
one main folder. As each page gains more functionality, they'll become folders,
with supporting components/models/functions split into files in that folder.
They'll also start getting more developers attached to each primary component;
full teams and roadmaps that become part of a broader plan for the
site/application. Each of these views will start managing their own specific
dependencies, and they'll decoupled from the main application in one of a number
of ways (i.e. microfrontends, or as separate workspaces, or separate packages,
or repositories that publish assets to a cdn, and so on.) Managing the growth of
these components and associated development practices and architecture then
becomes key to being able to iterate features safely, quickly, and reliably.

`modular` suggests 3 strategies for managing the growth of these components.

**Strategy 0**: Try to keep the codebase as small as possible, for as long as
possible.

The best kind of scale is no scale at all. As such, it would introduce
unnecessary complexity to a codebase if it takes on scaling strategies when only
1 (or few) developers are working on it, only for a little time, and for very
low stakes. In such a situation it would be a mistake to build a completely
decomposed architecture of React components with a design system, split into
multiple parts and files, when instead it could have been built with a plain
html file and an accompanying css file. If this is your situation, you do not
need `modular`, and you should invest your time and effort into something that
has better returns. If you do need a javascript framework, try to keep it in one
file. Split into multiple files only when it's painful. Only when you've
exhausted these basic scaling options, should you move on to the next option...

**Strategy 1**: Move development of the view to a
[workspace](https://classic.yarnpkg.com/en/docs/workspaces/).

If keeping each primary component in a sub-folder is causing growing pains in
the codebase, move it to a workspace. Workspaces are a great option, because
they provide some benefits of decoupling from the main application, without
losing the benefits of colocating within the same repository. Of note:

- Teams will be able to declare and manage their own dependencies instead of it
  all being crammed into a central package.json

- These components could (theoretically) be used in other applications, since
  they could be published from this workspace as a package (we try to avoid
  this. I should probably remove this point altogether.)

- A sense of ownership for the team; they can define their own
  [CODEOWNERS](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/about-code-owners)
  and code review flow, and most of their PRs and changes won't affect the
  working of the rest of the application.

- However, since they're all under one typescript project, they still won't
  break expectations (or if they do, the static type system will catch it and
  make you fix it to proceed with a commit/deploy)

- Similarly, tests will run for the entire repository, and assuming there's some
  form of integration/e2e coverage, it'll be hard to break expectations despite
  working in this isolated manner.

- It is relatively easy to make upgrades in this system; a core dependency can
  be updated, types and tests checked across the system, and changes committed
  in an atomic fashion. Something that would take weeks (if not months) in a
  distributed repo system will take a day or so (if not hours) in this
  centralised system.

In a repository generated by `modular`, you can add a view by running
`modular add <name>`, and choosing the option to create a View. This creates a
new workspace with the view name, that can be imported from the application, or
any of the other workspaces, but still will be included in the main build, and
participates in the type/test infrastructure. Since they're still regular React
components, you can wrap them with
[React.lazy](https://reactjs.org/docs/code-splitting.html#reactlazy) and use
them as regular components, but they won't be included in the main bundle, and
will load dynamically on demand. This is dope.

Now, with the dashboard usecase, there's usually never explicit code that
renders a specific view; 'layouts' are loaded from a database/service. To make
this system work well with `modular`, `modular` has a special module
[`modular-views.macro`](../packages/modular-views.macro/README.md); this module
exports an object that maps every view (wrapped with `React.lazy`) to a string
identifier (i.e. - the name of the view)

(question: do we want to use some other identifier? this seems sufficient for
now, but something to keep an eye on.)

This gives a scalable local registry of all the views/primary component, and
it's never necessary to manually update this map since it's defined based on the
state of the filesystem. This then becomes our primary system of 'dynamically'
loading and rendering views onto a rendering surface; we leverage and build on
regular javascript/React semantics instead of inventing something bespoke. This
is the power of colocating code in the same repository and scaling
infrastructure and tooling around it.

NB: It could be that someone has done a sparse checkout of the repository and
not included all the views in their local instance; no problem, the map excludes
those views from the map, and when rendered you can use a generic placeholder
component.

There are some cons to this system, and it's important to note that we're
trading one set of problems for these. However, these problems are a better set
of problems to have, have a lot of historical research and precedence and thus
aren't unique problems, and can be solved incrementally.

- Builds might become fairly big: In most cases, as long as you're not building
  a systems with many (read: 100s or 1000s of views), the build for such a
  system shouldn't be a problem. However, if you are building at that big a
  scale, you can expect the requirements for build infrastructure to increase
  proportionally. In that scenario, there are 3 'solutions':

  - Invest in having beefier hardware for doing builds (instead of a farm of
    weaker machines). This will give you some breathing space and time to fix
    root problems.

  - Invest in better tooling infrastructure; publicly available tools like
    webpack/parcel weren't built to handle that kind of scale. Consider adopting
    guidelines from
    [webpack's performance recommendations](https://webpack.js.org/guides/build-performance/).
    We are also aware that these tools are considering scale as a first class
    feature for newer versions, introducing features like module federation,
    persistent caching, incremental builds, and so on.

  - At this scale, it's not sufficient to simply follow public guidance, it'll
    probably be necessary to hire and invest in teams whose sole purpose is to
    solve these problems, much like big corps like facebook, google, etc do.
    `modular`is also working on providing these optimisations by default.

- Developer Workflow: Your teams may not be used to working in a single
  repository, and as such, may not have the tooling or guidance to do so. Some
  things that may make this better:

  - setting up
    [CODEOWNERS](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/about-code-owners)
    so every developer is not spammed with notifications about every PR, and
    only relevant people are targeted as reviewers.

  - Using a
    [feature flag service](https://gist.github.com/threepointone/2c2fae0622681284410ec9edcc6acf9e)
    to simplify uat/deploy workflows

  - using
    [sparse checkouts](https://gist.github.com/threepointone/d62b4d92a1e92df5f2f4d2d91a0582cd)
    to only work on the part of the codebase that's relevant to a developer

  - using a configuration service / key management service for holding and
    managing private/public keys used by the system

- Fighting conway's law (There's a whole spiel here about fighting company org
  structures that we'll write about some day)

We DO NOT recommend pulling your view into a another repository. There are
serious costs associated with this (TODO, critical: enumerate all the problems
with pulling into a separate repo / the multi repository architecture). However,
you may be dealing with a legacy/preexisting system where views/primary
components are defined and built in separate repositories, or some bespoke
component registry/loading system. We present a couple of strategies to
interface with those views:

**Strategy 2**: Wrap with a React component that establishes an interface
between your application and the component's expectations.

The idea here is to write a component that takes props that define how to load
and interface with a fully decoupled component. For example, you may have a
registry of components that are defined by a urls that are to be used as an
iframe src, and have a postmessage based api to communicate across the iframe
boundary. The wrapper component would then look something like this -

```jsx
function IframeWrap({ src }) {
  const iframeChannel = useContext(IframeWrapContext);

  const ref = useRef(null);

  useEffect(() => {
    // setup communication to send/receive data on iframeChannel

    return () => {
      // cleanup listeners
    };
  });

  return <iframe src={src} ref={ref} />;

  // enhancement - wrap this with React.lazy which resolves on iframe onload (or some other signal)
}
```

And somewhere at the top of your hierachy, expose the `iframeChannel` context on
a provider. It might look something like this:

```jsx
const IframeWrapContext = React.createContext(null);

function App() {
  return (
    <IframeWrapContext.Provider value={iframeChannel}>
      {/* ... load layouts ... */}
    </IframeWrapContext.Provider>
  );
}
```

Similarly, for other types of components, you would build similar wrappers that
interface with the component and the host.

NB: It's important to repeat and clarify: This is to be used _ONLY_ for existing
legacy views, and which can't be transitioned to using the primary system (i.e.
strategy 1). Do not use it for new views, you'll still face all the problems
prevalent with a multi-repository system.

**Strategy 3**: Perhaps there's a view (let's call it `X`) that exists in a
separate repository, but the team's owners/developers are willing to _gradually_
transition to adopting strategy 1. (if they can transition quickly, then they
should simply copy their source over immediately and call it a day.) The
assumption here, is that this package/view repository is setup up to export a
React component, possibly using its own build system and development setup. We
present the sequence of steps to take to gradually transition to strategy 1:

- Publish `X` to a package registry (like an internal npm instance).

- In the repo generated by `modular`, add a workspace with `modular add <name>`,
  where `<name>` is similar to the target view `X` (let's say `X-wrap`). In this
  view's main file (probably index.js), import `X`.

- Setup a system, either manual or automated, where updates to X are picked up,
  and updated in `X-wrap`'s package.json. Some options for doing this

  - the team that updates X can send a PR to the main repo that updates the
    package version

  - On a periodic basis, the host repository could run something like
    [ncu](https://www.npmjs.com/package/npm-check-updates) on every `*-wrap`
    workspace, updating to the latest version.

  - A bot could listen to the registry for version updates and automatically
    send a PR that updates the version number (and possibly commits it)

- Local development in this system is also relatively straightforward;
  developers will checkout the host repository on their local machines (either
  completely, or as a sparse checkout), and use
  [npm link](https://docs.npmjs.com/cli/link) to point to their view repository.

- Once the development-publish cycle is setup, then developers can take steps to
  remove any bespoke build/development assumptions, moving to the relatively
  vanilla assumptions that `modular` expects.

- Once that is done, and assuming that this team would like to participate in
  all the benefits of a colocated repository system, the entire view's source
  code can be moved into a new workspace `X` in the host's repository, and the
  view can stop publishing to the registry.

- Optionally (but recommended), `X-wrap` can be removed as a top level
  workspace, and layouts in the layout registry can rename all instances of
  `X-wrap` with `X`.

This strategy achieves most of the niceties of strategy 1, but provides deeper
decoupling abilities, at the cost of overhead of versioning and more complexity
in managing upgrades of modules/interfaces. It should ideally be done as quickly
as possible, moving to strategy 1 as soon as possible, or else one can expect
time and effort to be spent managing upgrades to the system (from both upgrades
to third party dependencies, or general changes to the type signatures of the
system).
