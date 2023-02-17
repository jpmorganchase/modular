/* esm.sh - esbuild bundle(scheduler@0.20.2) es2022 production */
var z = Object.create;
var O = Object.defineProperty;
var B = Object.getOwnPropertyDescriptor;
var G = Object.getOwnPropertyNames;
var ee = Object.getPrototypeOf,
  ne = Object.prototype.hasOwnProperty;
var V = (e, n) => () => (n || e((n = { exports: {} }).exports, n), n.exports);
var te = (e, n, t, l) => {
  if ((n && typeof n == 'object') || typeof n == 'function')
    for (let o of G(n))
      !ne.call(e, o) &&
        o !== t &&
        O(e, o, {
          get: () => n[o],
          enumerable: !(l = B(n, o)) || l.enumerable,
        });
  return e;
};
var re = (e, n, t) => (
  (t = e != null ? z(ee(e)) : {}),
  te(
    n || !e || !e.__esModule
      ? O(t, 'default', { value: e, enumerable: !0 })
      : t,
    e,
  )
);
var X = V((r) => {
  'use strict';
  var y, h, T, q;
  typeof performance == 'object' && typeof performance.now == 'function'
    ? ((H = performance),
      (r.unstable_now = function () {
        return H.now();
      }))
    : ((C = Date),
      (J = C.now()),
      (r.unstable_now = function () {
        return C.now() - J;
      }));
  var H, C, J;
  typeof window > 'u' || typeof MessageChannel != 'function'
    ? ((p = null),
      (L = null),
      (N = function () {
        if (p !== null)
          try {
            var e = r.unstable_now();
            p(!0, e), (p = null);
          } catch (n) {
            throw (setTimeout(N, 0), n);
          }
      }),
      (y = function (e) {
        p !== null ? setTimeout(y, 0, e) : ((p = e), setTimeout(N, 0));
      }),
      (h = function (e, n) {
        L = setTimeout(e, n);
      }),
      (T = function () {
        clearTimeout(L);
      }),
      (r.unstable_shouldYield = function () {
        return !1;
      }),
      (q = r.unstable_forceFrameRate = function () {}))
    : ((K = window.setTimeout),
      (Q = window.clearTimeout),
      typeof console < 'u' &&
        ((S = window.cancelAnimationFrame),
        typeof window.requestAnimationFrame != 'function' &&
          console.error(
            "This browser doesn't support requestAnimationFrame. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills",
          ),
        typeof S != 'function' &&
          console.error(
            "This browser doesn't support cancelAnimationFrame. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills",
          )),
      (m = !1),
      (w = null),
      (g = -1),
      (j = 5),
      (E = 0),
      (r.unstable_shouldYield = function () {
        return r.unstable_now() >= E;
      }),
      (q = function () {}),
      (r.unstable_forceFrameRate = function (e) {
        0 > e || 125 < e
          ? console.error(
              'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported',
            )
          : (j = 0 < e ? Math.floor(1e3 / e) : 5);
      }),
      (F = new MessageChannel()),
      (P = F.port2),
      (F.port1.onmessage = function () {
        if (w !== null) {
          var e = r.unstable_now();
          E = e + j;
          try {
            w(!0, e) ? P.postMessage(null) : ((m = !1), (w = null));
          } catch (n) {
            throw (P.postMessage(null), n);
          }
        } else m = !1;
      }),
      (y = function (e) {
        (w = e), m || ((m = !0), P.postMessage(null));
      }),
      (h = function (e, n) {
        g = K(function () {
          e(r.unstable_now());
        }, n);
      }),
      (T = function () {
        Q(g), (g = -1);
      }));
  var p, L, N, K, Q, S, m, w, g, j, E, F, P;
  function R(e, n) {
    var t = e.length;
    e.push(n);
    e: for (;;) {
      var l = (t - 1) >>> 1,
        o = e[l];
      if (o !== void 0 && 0 < x(o, n)) (e[l] = n), (e[t] = o), (t = l);
      else break e;
    }
  }
  function a(e) {
    return (e = e[0]), e === void 0 ? null : e;
  }
  function I(e) {
    var n = e[0];
    if (n !== void 0) {
      var t = e.pop();
      if (t !== n) {
        e[0] = t;
        e: for (var l = 0, o = e.length; l < o; ) {
          var f = 2 * (l + 1) - 1,
            b = e[f],
            v = f + 1,
            d = e[v];
          if (b !== void 0 && 0 > x(b, t))
            d !== void 0 && 0 > x(d, b)
              ? ((e[l] = d), (e[v] = t), (l = v))
              : ((e[l] = b), (e[f] = t), (l = f));
          else if (d !== void 0 && 0 > x(d, t)) (e[l] = d), (e[v] = t), (l = v);
          else break e;
        }
      }
      return n;
    }
    return null;
  }
  function x(e, n) {
    var t = e.sortIndex - n.sortIndex;
    return t !== 0 ? t : e.id - n.id;
  }
  var s = [],
    c = [],
    le = 1,
    u = null,
    i = 3,
    M = !1,
    _ = !1,
    k = !1;
  function Y(e) {
    for (var n = a(c); n !== null; ) {
      if (n.callback === null) I(c);
      else if (n.startTime <= e)
        I(c), (n.sortIndex = n.expirationTime), R(s, n);
      else break;
      n = a(c);
    }
  }
  function U(e) {
    if (((k = !1), Y(e), !_))
      if (a(s) !== null) (_ = !0), y(W);
      else {
        var n = a(c);
        n !== null && h(U, n.startTime - e);
      }
  }
  function W(e, n) {
    (_ = !1), k && ((k = !1), T()), (M = !0);
    var t = i;
    try {
      for (
        Y(n), u = a(s);
        u !== null &&
        (!(u.expirationTime > n) || (e && !r.unstable_shouldYield()));

      ) {
        var l = u.callback;
        if (typeof l == 'function') {
          (u.callback = null), (i = u.priorityLevel);
          var o = l(u.expirationTime <= n);
          (n = r.unstable_now()),
            typeof o == 'function' ? (u.callback = o) : u === a(s) && I(s),
            Y(n);
        } else I(s);
        u = a(s);
      }
      if (u !== null) var f = !0;
      else {
        var b = a(c);
        b !== null && h(U, b.startTime - n), (f = !1);
      }
      return f;
    } finally {
      (u = null), (i = t), (M = !1);
    }
  }
  var oe = q;
  r.unstable_IdlePriority = 5;
  r.unstable_ImmediatePriority = 1;
  r.unstable_LowPriority = 4;
  r.unstable_NormalPriority = 3;
  r.unstable_Profiling = null;
  r.unstable_UserBlockingPriority = 2;
  r.unstable_cancelCallback = function (e) {
    e.callback = null;
  };
  r.unstable_continueExecution = function () {
    _ || M || ((_ = !0), y(W));
  };
  r.unstable_getCurrentPriorityLevel = function () {
    return i;
  };
  r.unstable_getFirstCallbackNode = function () {
    return a(s);
  };
  r.unstable_next = function (e) {
    switch (i) {
      case 1:
      case 2:
      case 3:
        var n = 3;
        break;
      default:
        n = i;
    }
    var t = i;
    i = n;
    try {
      return e();
    } finally {
      i = t;
    }
  };
  r.unstable_pauseExecution = function () {};
  r.unstable_requestPaint = oe;
  r.unstable_runWithPriority = function (e, n) {
    switch (e) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        e = 3;
    }
    var t = i;
    i = e;
    try {
      return n();
    } finally {
      i = t;
    }
  };
  r.unstable_scheduleCallback = function (e, n, t) {
    var l = r.unstable_now();
    switch (
      (typeof t == 'object' && t !== null
        ? ((t = t.delay), (t = typeof t == 'number' && 0 < t ? l + t : l))
        : (t = l),
      e)
    ) {
      case 1:
        var o = -1;
        break;
      case 2:
        o = 250;
        break;
      case 5:
        o = 1073741823;
        break;
      case 4:
        o = 1e4;
        break;
      default:
        o = 5e3;
    }
    return (
      (o = t + o),
      (e = {
        id: le++,
        callback: n,
        priorityLevel: e,
        startTime: t,
        expirationTime: o,
        sortIndex: -1,
      }),
      t > l
        ? ((e.sortIndex = t),
          R(c, e),
          a(s) === null && e === a(c) && (k ? T() : (k = !0), h(U, t - l)))
        : ((e.sortIndex = o), R(s, e), _ || M || ((_ = !0), y(W))),
      e
    );
  };
  r.unstable_wrapCallback = function (e) {
    var n = i;
    return function () {
      var t = i;
      i = n;
      try {
        return e.apply(this, arguments);
      } finally {
        i = t;
      }
    };
  };
});
var $ = V((se, Z) => {
  'use strict';
  Z.exports = X();
});
var D = re($()),
  {
    unstable_now: ce,
    unstable_shouldYield: fe,
    unstable_IdlePriority: be,
    unstable_ImmediatePriority: _e,
    unstable_LowPriority: de,
    unstable_NormalPriority: pe,
    unstable_Profiling: ye,
    unstable_UserBlockingPriority: ve,
    unstable_cancelCallback: me,
    unstable_continueExecution: we,
    unstable_getCurrentPriorityLevel: he,
    unstable_getFirstCallbackNode: ke,
    unstable_next: ge,
    unstable_pauseExecution: Pe,
    unstable_requestPaint: xe,
    unstable_runWithPriority: Te,
    unstable_scheduleCallback: Ie,
    unstable_wrapCallback: Me,
  } = D,
  { default: A, ...ie } = D,
  Ce = A !== void 0 ? A : ie;
export {
  Ce as default,
  be as unstable_IdlePriority,
  _e as unstable_ImmediatePriority,
  de as unstable_LowPriority,
  pe as unstable_NormalPriority,
  ye as unstable_Profiling,
  ve as unstable_UserBlockingPriority,
  me as unstable_cancelCallback,
  we as unstable_continueExecution,
  he as unstable_getCurrentPriorityLevel,
  ke as unstable_getFirstCallbackNode,
  ge as unstable_next,
  ce as unstable_now,
  Pe as unstable_pauseExecution,
  xe as unstable_requestPaint,
  Te as unstable_runWithPriority,
  Ie as unstable_scheduleCallback,
  fe as unstable_shouldYield,
  Me as unstable_wrapCallback,
};
/*! Bundled license information:

scheduler/cjs/scheduler.production.min.js:
  (** @license React v0.20.2
   * scheduler.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
