import * as e from 'http://localhost:8484/react@17.0.2.js';
var t = {
    d: (e, a) => {
      for (var l in a)
        t.o(a, l) &&
          !t.o(e, l) &&
          Object.defineProperty(e, l, { enumerable: !0, get: a[l] });
    },
    o: (e, t) => Object.prototype.hasOwnProperty.call(e, t),
  },
  a = {};
t.d(a, { Z: () => r });
const l = ((e) => {
  var a = {};
  return t.d(a, e), a;
})({ default: () => e.default, useState: () => e.useState });
function r() {
  const [e, t] = (0, l.useState)(['foo', 'bar', 'baz']);
  return l.default.createElement(
    'div',
    null,
    l.default.createElement('h1', null, 'My List'),
    l.default.createElement(
      'ul',
      null,
      e.map((e) => l.default.createElement('li', null, e)),
    ),
    l.default.createElement(
      'button',
      {
        onClick: () => {
          t(['baz', 'bar', 'foo']);
        },
      },
      'Invert list order',
    ),
  );
}
var o = a.Z;
export { o as default };
//# sourceMappingURL=main.874f720c.js.map
