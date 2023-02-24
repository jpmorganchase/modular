import * as e from 'https://esm.sh/react@17.0.2&deps=react@17.0.2,react-dom@17.0.2&pin=v106';
import * as t from 'https://esm.sh/regular-table@0.5.6&deps=react@17.0.2,react-dom@17.0.2&pin=v106';
import * as r from 'https://esm.sh/minifaker@1.34.1&deps=react@17.0.2,react-dom@17.0.2&pin=v106/locales/en';
import * as n from 'https://esm.sh/minifaker@1.34.1&deps=react@17.0.2,react-dom@17.0.2&pin=v106';
var a = { 545: () => {} },
  o = {};
function s(e) {
  var t = o[e];
  if (void 0 !== t) return t.exports;
  var r = (o[e] = { exports: {} });
  return a[e](r, r.exports, s), r.exports;
}
(s.d = (e, t) => {
  for (var r in t)
    s.o(t, r) &&
      !s.o(e, r) &&
      Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
}),
  (s.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t));
var c = {};
(() => {
  s.d(c, { Z: () => i });
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
  const a = ((e) => {
    var t = {};
    return s.d(t, e), t;
  })({ default: () => r.default });
  const o = ((e) => {
    var t = {};
    return s.d(t, e), t;
  })({
    country: () => n.country,
    default: () => n.default,
    domainName: () => n.domainName,
    word: () => n.word,
  });
  o.default.addLocale('en', a.default);
  const l = { green: '#e4ebe4', red: '#f1dbdb' };
  function d(e) {
    return e[0].toUpperCase() + e.slice(1);
  }
  const u = t.default.memo(function () {
    const e = (0, t.useRef)(null),
      r = (0, t.useRef)(null),
      n = (function (e) {
        const t = [
            () =>
              `${d((0, o.word)({ type: 'adjective' }))} ${d(
                (0, o.word)({ type: 'noun' }),
              )}`,
            () => String(Math.ceil(100 * Math.random())),
            () => (0, o.country)({ useCode: 'alpha3' }),
            o.domainName,
            () => String((1e3 * Math.random()).toFixed(2)),
          ],
          r = [];
        for (let n = 0; n < t.length; n += 1) {
          const a = [];
          for (let r = 0; r < e; r += 1) a.push(t[n]());
          r.push(a);
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
        const a = r.current;
        a.setDataListener(function (e, t, r, a) {
          const o = [];
          for (let c = 0; c < n[4].length; c += 1) {
            const e = 100 * Math.random() - 50;
            (n[4][c] = String((parseFloat(n[4][c]) + e).toFixed(2))),
              (o[c] = e < 0 ? 'red' : 'green');
          }
          const s = {
            num_rows: n[0].length,
            num_columns: n.length,
            data: n.slice(e, r).map((e) => e.slice(t, a)),
            column_headers: [
              ['Company Name'],
              ['Employees'],
              ['Country'],
              ['Domain'],
              ['Price'],
            ],
            metadata: [[], [], [], [], o],
          };
          return Promise.resolve(s);
        }),
          a.addStyleListener(() => {
            const e = a.querySelectorAll('thead th');
            for (const r of e)
              (r.style.textAlign = 'left'),
                (r.style.fontWeight = '900'),
                (r.style.padding = '0 0 12px 0');
            const t = a.querySelectorAll('body td');
            for (const r of t) {
              const e = a.getMeta(r);
              e.user && (r.style.backgroundColor = l[e.user]);
            }
          });
      }),
      (0, t.useEffect)(() => {
        r.current.draw(), setInterval(() => r.current.draw(), 1e3);
      }),
      t.default.createElement('div', { ref: e })
    );
  });
  function i() {
    return t.createElement(u, null);
  }
})();
var l = c.Z;
export { l as default };
//# sourceMappingURL=main.f5af2115.js.map
