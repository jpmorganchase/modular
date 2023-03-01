import * as e from 'http://localhost:8484/react@17.0.2.js';
var t = {
    d: (e, a) => {
      for (var n in a)
        t.o(a, n) &&
          !t.o(e, n) &&
          Object.defineProperty(e, n, { enumerable: !0, get: a[n] });
    },
    o: (e, t) => Object.prototype.hasOwnProperty.call(e, t),
  },
  a = {};
t.d(a, { Z: () => r });
const n = ((e) => {
  var a = {};
  return t.d(a, e), a;
})({ default: () => e.default, useState: () => e.useState });
function r() {
  const [e, t] = (0, n.useState)('Some card contents');
  return n.default.createElement(
    'div',
    null,
    n.default.createElement('h1', null, 'My Card'),
    n.default.createElement('span', null, e),
    n.default.createElement(
      'button',
      {
        onClick: () => {
          t('Some mutated card contents');
        },
      },
      'Change card content',
    ),
  );
}
var l = a.Z;
export { l as default };
//# sourceMappingURL=main.5a34a408.js.map
