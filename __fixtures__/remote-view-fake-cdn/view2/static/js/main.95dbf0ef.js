import * as e from 'https://esm.sh/react@18.2.0';
import * as t from 'https://esm.sh/regular-table@0.5.6';
import * as r from 'https://esm.sh/minifaker@1.34.1/locales/en';
import * as n from 'https://esm.sh/minifaker@1.34.1';
var o = { 545: () => {} },
  a = {};
function s(e) {
  var t = a[e];
  if (void 0 !== t) return t.exports;
  var r = (a[e] = { exports: {} });
  return o[e](r, r.exports, s), r.exports;
}
(s.d = (e, t) => {
  for (var r in t)
    s.o(t, r) &&
      !s.o(e, r) &&
      Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
}),
  (s.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t));
var l = {};
(() => {
  s.d(l, { Z: () => f });
  const t = ((e) => {
    var t = {};
    return s.d(t, e), t;
  })({
    createElement: () => e.createElement,
    default: () => e.default,
    useEffect: () => e.useEffect,
    useRef: () => e.useRef,
  });
  s(545);
  ((e) => {
    var t = {};
    s.d(t, e);
  })({});
  const o = ((e) => {
    var t = {};
    return s.d(t, e), t;
  })({ default: () => r.default });
  const a = ((e) => {
    var t = {};
    return s.d(t, e), t;
  })({
    country: () => n.country,
    default: () => n.default,
    domainName: () => n.domainName,
    word: () => n.word,
  });
  a.default.addLocale('en', o.default);
  const u = { green: '#e4ebe4', red: '#f1dbdb' };
  function c(e) {
    return e[0].toUpperCase() + e.slice(1);
  }
  const d = t.default.memo(function () {
    const e = (0, t.useRef)(null),
      r = (0, t.useRef)(null),
      n = (function (e) {
        const t = [
            () =>
              `${c((0, a.word)({ type: 'adjective' }))} ${c(
                (0, a.word)({ type: 'noun' }),
              )}`,
            () => String(Math.ceil(100 * Math.random())),
            () => (0, a.country)({ useCode: 'alpha3' }),
            a.domainName,
            () => String((1e3 * Math.random()).toFixed(2)),
          ],
          r = [];
        for (let n = 0; n < t.length; n += 1) {
          const o = [];
          for (let r = 0; r < e; r += 1) o.push(t[n]());
          r.push(o);
        }
        return r;
      })(5e3);
    return (
      (0, t.useEffect)(() => {
        if (document.getElementById('view2-table'))
          return void console.warn(
            'view2 was remounted and attempted to create a new table, cancelling',
          );
        const t = document.createElement('regular-table');
        t.setAttribute('id', 'view2-table'),
          (r.current = t),
          e.current?.appendChild(t);
        const o = r.current;
        o.setDataListener(function (e, t, r, o) {
          const a = [];
          for (let l = 0; l < n[4].length; l += 1) {
            const e = 100 * Math.random() - 50;
            (n[4][l] = String((parseFloat(n[4][l]) + e).toFixed(2))),
              (a[l] = e < 0 ? 'red' : 'green');
          }
          const s = {
            num_rows: n[0].length,
            num_columns: n.length,
            data: n.slice(e, r).map((e) => e.slice(t, o)),
            column_headers: [
              ['Company Name'],
              ['Employees'],
              ['Country'],
              ['Domain'],
              ['Price'],
            ],
            metadata: [[], [], [], [], a],
          };
          return Promise.resolve(s);
        }),
          o.addStyleListener(() => {
            const e = o.querySelectorAll('thead th');
            for (const r of e)
              (r.style.textAlign = 'left'),
                (r.style.fontWeight = '900'),
                (r.style.padding = '0 0 12px 0');
            const t = o.querySelectorAll('body td');
            for (const r of t) {
              const e = o.getMeta(r);
              e.user && (r.style.backgroundColor = u[e.user]);
            }
          });
      }),
      (0, t.useEffect)(() => {
        r.current.draw(), setInterval(() => r.current.draw(), 1e3);
      }),
      t.default.createElement('div', { ref: e })
    );
  });
  function f() {
    return t.createElement(d, null);
  }
})();
var u = l.Z;
export { u as default };
//# sourceMappingURL=main.95dbf0ef.js.map
