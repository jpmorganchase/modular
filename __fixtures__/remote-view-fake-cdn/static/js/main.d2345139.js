import * as t from 'http://localhost:8484/react@17.0.2.js';
var e = {
    307: (t, e, r) => {
      r(168), (t.exports = self.fetch.bind(self));
    },
    168: (t, e, r) => {
      r.r(e),
        r.d(e, {
          DOMException: () => B,
          Headers: () => y,
          Request: () => E,
          Response: () => _,
          fetch: () => O,
        });
      var o =
          ('undefined' !== typeof globalThis && globalThis) ||
          ('undefined' !== typeof self && self) ||
          ('undefined' !== typeof o && o),
        n = 'URLSearchParams' in o,
        i = 'Symbol' in o && 'iterator' in Symbol,
        s =
          'FileReader' in o &&
          'Blob' in o &&
          (function () {
            try {
              return new Blob(), !0;
            } catch (t) {
              return !1;
            }
          })(),
        a = 'FormData' in o,
        u = 'ArrayBuffer' in o;
      if (u)
        var f = [
            '[object Int8Array]',
            '[object Uint8Array]',
            '[object Uint8ClampedArray]',
            '[object Int16Array]',
            '[object Uint16Array]',
            '[object Int32Array]',
            '[object Uint32Array]',
            '[object Float32Array]',
            '[object Float64Array]',
          ],
          h =
            ArrayBuffer.isView ||
            function (t) {
              return t && f.indexOf(Object.prototype.toString.call(t)) > -1;
            };
      function c(t) {
        if (
          ('string' !== typeof t && (t = String(t)),
          /[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(t) || '' === t)
        )
          throw new TypeError(
            'Invalid character in header field name: "' + t + '"',
          );
        return t.toLowerCase();
      }
      function d(t) {
        return 'string' !== typeof t && (t = String(t)), t;
      }
      function l(t) {
        var e = {
          next: function () {
            var e = t.shift();
            return { done: void 0 === e, value: e };
          },
        };
        return (
          i &&
            (e[Symbol.iterator] = function () {
              return e;
            }),
          e
        );
      }
      function y(t) {
        (this.map = {}),
          t instanceof y
            ? t.forEach(function (t, e) {
                this.append(e, t);
              }, this)
            : Array.isArray(t)
            ? t.forEach(function (t) {
                this.append(t[0], t[1]);
              }, this)
            : t &&
              Object.getOwnPropertyNames(t).forEach(function (e) {
                this.append(e, t[e]);
              }, this);
      }
      function p(t) {
        if (t.bodyUsed) return Promise.reject(new TypeError('Already read'));
        t.bodyUsed = !0;
      }
      function b(t) {
        return new Promise(function (e, r) {
          (t.onload = function () {
            e(t.result);
          }),
            (t.onerror = function () {
              r(t.error);
            });
        });
      }
      function m(t) {
        var e = new FileReader(),
          r = b(e);
        return e.readAsArrayBuffer(t), r;
      }
      function w(t) {
        if (t.slice) return t.slice(0);
        var e = new Uint8Array(t.byteLength);
        return e.set(new Uint8Array(t)), e.buffer;
      }
      function v() {
        return (
          (this.bodyUsed = !1),
          (this._initBody = function (t) {
            var e;
            (this.bodyUsed = this.bodyUsed),
              (this._bodyInit = t),
              t
                ? 'string' === typeof t
                  ? (this._bodyText = t)
                  : s && Blob.prototype.isPrototypeOf(t)
                  ? (this._bodyBlob = t)
                  : a && FormData.prototype.isPrototypeOf(t)
                  ? (this._bodyFormData = t)
                  : n && URLSearchParams.prototype.isPrototypeOf(t)
                  ? (this._bodyText = t.toString())
                  : u && s && (e = t) && DataView.prototype.isPrototypeOf(e)
                  ? ((this._bodyArrayBuffer = w(t.buffer)),
                    (this._bodyInit = new Blob([this._bodyArrayBuffer])))
                  : u && (ArrayBuffer.prototype.isPrototypeOf(t) || h(t))
                  ? (this._bodyArrayBuffer = w(t))
                  : (this._bodyText = t = Object.prototype.toString.call(t))
                : (this._bodyText = ''),
              this.headers.get('content-type') ||
                ('string' === typeof t
                  ? this.headers.set('content-type', 'text/plain;charset=UTF-8')
                  : this._bodyBlob && this._bodyBlob.type
                  ? this.headers.set('content-type', this._bodyBlob.type)
                  : n &&
                    URLSearchParams.prototype.isPrototypeOf(t) &&
                    this.headers.set(
                      'content-type',
                      'application/x-www-form-urlencoded;charset=UTF-8',
                    ));
          }),
          s &&
            ((this.blob = function () {
              var t = p(this);
              if (t) return t;
              if (this._bodyBlob) return Promise.resolve(this._bodyBlob);
              if (this._bodyArrayBuffer)
                return Promise.resolve(new Blob([this._bodyArrayBuffer]));
              if (this._bodyFormData)
                throw new Error('could not read FormData body as blob');
              return Promise.resolve(new Blob([this._bodyText]));
            }),
            (this.arrayBuffer = function () {
              if (this._bodyArrayBuffer) {
                var t = p(this);
                return (
                  t ||
                  (ArrayBuffer.isView(this._bodyArrayBuffer)
                    ? Promise.resolve(
                        this._bodyArrayBuffer.buffer.slice(
                          this._bodyArrayBuffer.byteOffset,
                          this._bodyArrayBuffer.byteOffset +
                            this._bodyArrayBuffer.byteLength,
                        ),
                      )
                    : Promise.resolve(this._bodyArrayBuffer))
                );
              }
              return this.blob().then(m);
            })),
          (this.text = function () {
            var t = p(this);
            if (t) return t;
            if (this._bodyBlob)
              return (function (t) {
                var e = new FileReader(),
                  r = b(e);
                return e.readAsText(t), r;
              })(this._bodyBlob);
            if (this._bodyArrayBuffer)
              return Promise.resolve(
                (function (t) {
                  for (
                    var e = new Uint8Array(t), r = new Array(e.length), o = 0;
                    o < e.length;
                    o++
                  )
                    r[o] = String.fromCharCode(e[o]);
                  return r.join('');
                })(this._bodyArrayBuffer),
              );
            if (this._bodyFormData)
              throw new Error('could not read FormData body as text');
            return Promise.resolve(this._bodyText);
          }),
          a &&
            (this.formData = function () {
              return this.text().then(T);
            }),
          (this.json = function () {
            return this.text().then(JSON.parse);
          }),
          this
        );
      }
      (y.prototype.append = function (t, e) {
        (t = c(t)), (e = d(e));
        var r = this.map[t];
        this.map[t] = r ? r + ', ' + e : e;
      }),
        (y.prototype.delete = function (t) {
          delete this.map[c(t)];
        }),
        (y.prototype.get = function (t) {
          return (t = c(t)), this.has(t) ? this.map[t] : null;
        }),
        (y.prototype.has = function (t) {
          return this.map.hasOwnProperty(c(t));
        }),
        (y.prototype.set = function (t, e) {
          this.map[c(t)] = d(e);
        }),
        (y.prototype.forEach = function (t, e) {
          for (var r in this.map)
            this.map.hasOwnProperty(r) && t.call(e, this.map[r], r, this);
        }),
        (y.prototype.keys = function () {
          var t = [];
          return (
            this.forEach(function (e, r) {
              t.push(r);
            }),
            l(t)
          );
        }),
        (y.prototype.values = function () {
          var t = [];
          return (
            this.forEach(function (e) {
              t.push(e);
            }),
            l(t)
          );
        }),
        (y.prototype.entries = function () {
          var t = [];
          return (
            this.forEach(function (e, r) {
              t.push([r, e]);
            }),
            l(t)
          );
        }),
        i && (y.prototype[Symbol.iterator] = y.prototype.entries);
      var g = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];
      function E(t, e) {
        if (!(this instanceof E))
          throw new TypeError(
            'Please use the "new" operator, this DOM object constructor cannot be called as a function.',
          );
        var r = (e = e || {}).body;
        if (t instanceof E) {
          if (t.bodyUsed) throw new TypeError('Already read');
          (this.url = t.url),
            (this.credentials = t.credentials),
            e.headers || (this.headers = new y(t.headers)),
            (this.method = t.method),
            (this.mode = t.mode),
            (this.signal = t.signal),
            r || null == t._bodyInit || ((r = t._bodyInit), (t.bodyUsed = !0));
        } else this.url = String(t);
        if (
          ((this.credentials =
            e.credentials || this.credentials || 'same-origin'),
          (!e.headers && this.headers) || (this.headers = new y(e.headers)),
          (this.method = (function (t) {
            var e = t.toUpperCase();
            return g.indexOf(e) > -1 ? e : t;
          })(e.method || this.method || 'GET')),
          (this.mode = e.mode || this.mode || null),
          (this.signal = e.signal || this.signal),
          (this.referrer = null),
          ('GET' === this.method || 'HEAD' === this.method) && r)
        )
          throw new TypeError('Body not allowed for GET or HEAD requests');
        if (
          (this._initBody(r),
          ('GET' === this.method || 'HEAD' === this.method) &&
            ('no-store' === e.cache || 'no-cache' === e.cache))
        ) {
          var o = /([?&])_=[^&]*/;
          if (o.test(this.url))
            this.url = this.url.replace(o, '$1_=' + new Date().getTime());
          else {
            this.url +=
              (/\?/.test(this.url) ? '&' : '?') + '_=' + new Date().getTime();
          }
        }
      }
      function T(t) {
        var e = new FormData();
        return (
          t
            .trim()
            .split('&')
            .forEach(function (t) {
              if (t) {
                var r = t.split('='),
                  o = r.shift().replace(/\+/g, ' '),
                  n = r.join('=').replace(/\+/g, ' ');
                e.append(decodeURIComponent(o), decodeURIComponent(n));
              }
            }),
          e
        );
      }
      function A(t) {
        var e = new y();
        return (
          t
            .replace(/\r?\n[\t ]+/g, ' ')
            .split('\r')
            .map(function (t) {
              return 0 === t.indexOf('\n') ? t.substr(1, t.length) : t;
            })
            .forEach(function (t) {
              var r = t.split(':'),
                o = r.shift().trim();
              if (o) {
                var n = r.join(':').trim();
                e.append(o, n);
              }
            }),
          e
        );
      }
      function _(t, e) {
        if (!(this instanceof _))
          throw new TypeError(
            'Please use the "new" operator, this DOM object constructor cannot be called as a function.',
          );
        e || (e = {}),
          (this.type = 'default'),
          (this.status = void 0 === e.status ? 200 : e.status),
          (this.ok = this.status >= 200 && this.status < 300),
          (this.statusText = void 0 === e.statusText ? '' : '' + e.statusText),
          (this.headers = new y(e.headers)),
          (this.url = e.url || ''),
          this._initBody(t);
      }
      (E.prototype.clone = function () {
        return new E(this, { body: this._bodyInit });
      }),
        v.call(E.prototype),
        v.call(_.prototype),
        (_.prototype.clone = function () {
          return new _(this._bodyInit, {
            status: this.status,
            statusText: this.statusText,
            headers: new y(this.headers),
            url: this.url,
          });
        }),
        (_.error = function () {
          var t = new _(null, { status: 0, statusText: '' });
          return (t.type = 'error'), t;
        });
      var x = [301, 302, 303, 307, 308];
      _.redirect = function (t, e) {
        if (-1 === x.indexOf(e)) throw new RangeError('Invalid status code');
        return new _(null, { status: e, headers: { location: t } });
      };
      var B = o.DOMException;
      try {
        new B();
      } catch (P) {
        ((B = function (t, e) {
          (this.message = t), (this.name = e);
          var r = Error(t);
          this.stack = r.stack;
        }).prototype = Object.create(Error.prototype)),
          (B.prototype.constructor = B);
      }
      function O(t, e) {
        return new Promise(function (r, n) {
          var i = new E(t, e);
          if (i.signal && i.signal.aborted)
            return n(new B('Aborted', 'AbortError'));
          var a = new XMLHttpRequest();
          function f() {
            a.abort();
          }
          (a.onload = function () {
            var t = {
              status: a.status,
              statusText: a.statusText,
              headers: A(a.getAllResponseHeaders() || ''),
            };
            t.url =
              'responseURL' in a
                ? a.responseURL
                : t.headers.get('X-Request-URL');
            var e = 'response' in a ? a.response : a.responseText;
            setTimeout(function () {
              r(new _(e, t));
            }, 0);
          }),
            (a.onerror = function () {
              setTimeout(function () {
                n(new TypeError('Network request failed'));
              }, 0);
            }),
            (a.ontimeout = function () {
              setTimeout(function () {
                n(new TypeError('Network request failed'));
              }, 0);
            }),
            (a.onabort = function () {
              setTimeout(function () {
                n(new B('Aborted', 'AbortError'));
              }, 0);
            }),
            a.open(
              i.method,
              (function (t) {
                try {
                  return '' === t && o.location.href ? o.location.href : t;
                } catch (e) {
                  return t;
                }
              })(i.url),
              !0,
            ),
            'include' === i.credentials
              ? (a.withCredentials = !0)
              : 'omit' === i.credentials && (a.withCredentials = !1),
            'responseType' in a &&
              (s
                ? (a.responseType = 'blob')
                : u &&
                  i.headers.get('Content-Type') &&
                  -1 !==
                    i.headers
                      .get('Content-Type')
                      .indexOf('application/octet-stream') &&
                  (a.responseType = 'arraybuffer')),
            !e || 'object' !== typeof e.headers || e.headers instanceof y
              ? i.headers.forEach(function (t, e) {
                  a.setRequestHeader(e, t);
                })
              : Object.getOwnPropertyNames(e.headers).forEach(function (t) {
                  a.setRequestHeader(t, d(e.headers[t]));
                }),
            i.signal &&
              (i.signal.addEventListener('abort', f),
              (a.onreadystatechange = function () {
                4 === a.readyState && i.signal.removeEventListener('abort', f);
              })),
            a.send('undefined' === typeof i._bodyInit ? null : i._bodyInit);
        });
      }
      (O.polyfill = !0),
        o.fetch ||
          ((o.fetch = O), (o.Headers = y), (o.Request = E), (o.Response = _));
    },
  },
  r = {};
function o(t) {
  var n = r[t];
  if (void 0 !== n) return n.exports;
  var i = (r[t] = { exports: {} });
  return e[t](i, i.exports, o), i.exports;
}
(o.d = (t, e) => {
  for (var r in e)
    o.o(e, r) &&
      !o.o(t, r) &&
      Object.defineProperty(t, r, { enumerable: !0, get: e[r] });
}),
  (o.o = (t, e) => Object.prototype.hasOwnProperty.call(t, e)),
  (o.r = (t) => {
    'undefined' !== typeof Symbol &&
      Symbol.toStringTag &&
      Object.defineProperty(t, Symbol.toStringTag, { value: 'Module' }),
      Object.defineProperty(t, '__esModule', { value: !0 });
  });
var n = {};
(() => {
  o.d(n, { Z: () => h });
  const e = ((t) => {
      var e = {};
      return o.d(e, t), e;
    })({
      createContext: () => t.createContext,
      default: () => t.default,
      useContext: () => t.useContext,
      useEffect: () => t.useEffect,
      useState: () => t.useState,
    }),
    r = (0, e.createContext)([{}, () => null]),
    i = Symbol('loading');
  o(307);
  function s(t) {
    const e = document.head;
    e.querySelector(`link[href="${t}"]`) ||
      e.insertAdjacentHTML(
        'beforeend',
        `<link rel='stylesheet' href='${t}' />`,
      );
  }
  const a = (t, o) => {
      const [n, a] = (0, e.useContext)(r),
        u = n[t];
      return (
        (0, e.useEffect)(() => {
          void 0 === u &&
            (async function (t, r) {
              const o = await fetch(`${t}/package.json`),
                n = await o.json(),
                i = n?.modular?.type;
              if (!i || ('esm-view' !== i && 'app' !== i))
                throw new Error(
                  `Can't load package ${
                    n.name
                  } because type is missing or not supported: "${
                    i || JSON.stringify(i)
                  }"`,
                );
              if ('app' === i || (r && r(n)))
                return () =>
                  e.default.createElement('iframe', {
                    title: n.name,
                    src: `${t}/index.html`,
                  });
              if (
                (n.styleImports?.forEach(s),
                n.style && s(`${t}/${n.style}`),
                n.module)
              ) {
                const { default: e } = await import(`${t}${n.module}`);
                return e;
              }
            })(t, o).then((e) => {
              e && a((r) => ({ ...r, [t]: e }));
            });
        }, [u, t, a, o]),
        void 0 === u || u === i ? null : u
      );
    },
    u = ({ baseUrl: t, loadWithIframeFallback: r }) => {
      const o = a(t, r);
      return (
        (o && e.default.createElement(o, null)) ||
        e.default.createElement('div', null, 'Loading')
      );
    },
    f = ({ children: t }) => {
      const o = (0, e.useState)({});
      return e.default.createElement(r.Provider, { value: o }, t);
    };
  function h() {
    const [t] = (0, e.useState)([
      'http://localhost:8484/esm-view-card',
      'http://localhost:8484/esm-view-list',
    ]);
    return e.default.createElement(
      f,
      null,
      t.map((t, r) =>
        e.default.createElement(
          'section',
          { key: r },
          e.default.createElement(u, { baseUrl: t }),
        ),
      ),
    );
  }
})();
var i = n.Z;
export { i as default };
//# sourceMappingURL=main.d2345139.js.map
